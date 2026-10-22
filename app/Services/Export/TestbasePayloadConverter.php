<?php

namespace App\Services\Export;

use App\Models\Question;
use App\Models\QuestionType;
use App\Support\Questions\QuestionTypeSchemaRegistry;
use DomainException;
use DOMDocument;
use DOMElement;
use DOMNode;

class TestbasePayloadConverter
{
    /** @var array<string, string> */
    private array $assets = [];

    public function assets(): array
    {
        return $this->assets;
    }

    public function convert(Question $question, QuestionType $type, string $medium): array
    {
        $this->scanAssets($question->content);
        foreach (['statement_en', 'statement_ur', 'description_en', 'description_ur', 'answer_en', 'answer_ur'] as $field) {
            $this->scanAssets($question->{$field});
        }
        $effectiveType = QuestionTypeSchemaRegistry::typeForQuestion($question, $type);
        $sourceSchema = $effectiveType->schema_key ?: QuestionTypeSchemaRegistry::infer(
            (bool) $type->is_objective,
            [
                'objective_type_id' => $type->objective_type_id,
                'have_description' => $type->have_description,
                'have_answer' => $type->have_answer,
            ],
        );
        $schema = match ($sourceSchema) {
            'objective_mcq' => $type->options_only ? 'OPTIONS_ONLY_OBJECTIVE' : 'STANDARD_OBJECTIVE',
            'objective_blank_choice' => 'STANDARD_OBJECTIVE',
            'objective_true_false' => 'TRUE_FALSE',
            'objective_passage_mcq' => 'PASSAGE_OBJECTIVE',
            'subjective_standard', 'subjective_same_statement' => 'STANDARD_SUBJECTIVE',
            'subjective_grouped' => 'GROUPED_SUBJECTIVE',
            default => null,
        };
        $itemCount = in_array($sourceSchema, ['objective_passage_mcq', 'subjective_grouped'], true)
            ? count((array) (($question->content ?? [])['items'] ?? [])) : 1;
        $itemCount = max(1, $itemCount);

        if ($schema === null) {
            return compact('schema', 'sourceSchema', 'itemCount') + [
                'payload' => null,
                'issues' => ['Source schema has no compatible TestBase conversion.'],
            ];
        }

        try {
            if ($itemCount > 30) {
                throw new DomainException('Grouped question exceeds 30 items.');
            }
            if ($schema === 'OPTIONS_ONLY_OBJECTIVE') {
                $stored = is_array($question->content) ? $question->content : [];
                foreach ([$stored['prompt_en'] ?? null, $stored['prompt_ur'] ?? null,
                    $question->statement_en, $question->statement_ur] as $oldStatement) {
                    if ($this->document($oldStatement) !== null) {
                        throw new DomainException('Options-only source retains a statement that cannot be discarded.');
                    }
                }
            }
            $content = QuestionTypeSchemaRegistry::contentFromQuestion($question, $effectiveType);
            $root = $this->part('q'.$question->id);
            $payload = $root + [
                'version' => 1,
                'groupMode' => 'PARTS',
                'passage' => $this->empty(),
                'shared' => null,
                'parts' => [],
            ];
            if ($schema === 'PASSAGE_OBJECTIVE') {
                if (! $type->is_single) {
                    throw new DomainException('Multiple-answer passage questions are unsupported.');
                }
                $payload['passage'] = $this->pair($content, 'passage');
                $payload['parts'] = $this->parts($question, $content, true);
            } elseif ($schema === 'GROUPED_SUBJECTIVE') {
                $payload['passage'] = $this->pair($content, 'intro');
                $payload['parts'] = $this->parts($question, $content, false);
                // TestMaker has no explicit passage/multipart flag. Keep its introduction
                // in PARTS mode so an authored passage is never inferred from text alone.
            } else {
                $payload['statement'] = $schema === 'OPTIONS_ONLY_OBJECTIVE'
                    ? $this->empty() : $this->pair($content, 'prompt');
                if (in_array($schema, ['STANDARD_OBJECTIVE', 'OPTIONS_ONLY_OBJECTIVE'], true)) {
                    if ($sourceSchema === 'objective_blank_choice' && $this->pairIsEmpty($payload['statement'])) {
                        throw new DomainException('Blank-choice statement cannot be converted losslessly.');
                    }
                    [$payload['options'], $payload['correctOptionId']] = $this->options(
                        (array) ($content['options'] ?? []), 'q'.$question->id,
                    );
                    if (! $type->is_single) {
                        throw new DomainException('Multiple-answer objective question is unsupported.');
                    }
                } elseif ($schema === 'TRUE_FALSE') {
                    $payload['truth'] = match ($content['correct_boolean'] ?? null) {
                        'true' => true, 'false' => false,
                        default => throw new DomainException('True/false answer is missing or ambiguous.'),
                    };
                } elseif ($sourceSchema === 'subjective_same_statement') {
                    $en = $this->document($content['shared_en'] ?? null);
                    $ur = $this->document($content['shared_ur'] ?? null);
                    if ($en !== null && $ur !== null && $en !== $ur) {
                        throw new DomainException('Different English and Urdu shared content cannot be merged.');
                    }
                    $payload['shared'] = $en ?? $ur;
                    $payload['answer'] = $this->pair($content, 'answer');
                } else {
                    $payload['answer'] = $this->pair($content, 'answer');
                    $payload['explanation'] = $this->pair($content, 'guidance');
                }
            }

            $this->requireMedium($payload, $schema, $medium);
            if (strlen(json_encode($payload, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE)) > 500000) {
                throw new DomainException('Question payload exceeds 500 KB.');
            }
            $nodes = 0;
            $this->validateRich($payload, 0, $nodes);

            return compact('schema', 'sourceSchema', 'itemCount', 'payload') + ['issues' => []];
        } catch (DomainException $exception) {
            return compact('schema', 'sourceSchema', 'itemCount') + [
                'payload' => null,
                'issues' => [$exception->getMessage()],
            ];
        }
    }

    private function parts(Question $question, array $content, bool $objective): array
    {
        $items = $content['items'] ?? [];
        if (! is_array($items) || ! array_is_list($items) || $items === []) {
            throw new DomainException('Grouped question has no usable items.');
        }
        $parts = [];
        foreach ($items as $index => $item) {
            if (! is_array($item)) {
                throw new DomainException('Grouped question item is malformed.');
            }
            $part = $this->part('p'.$question->id.'-'.$index);
            $part['statement'] = $this->pair($item, 'prompt');
            if ($objective) {
                [$part['options'], $part['correctOptionId']] = $this->options(
                    (array) ($item['options'] ?? []), 'p'.$question->id.'-'.$index,
                );
            } else {
                $part['answer'] = $this->pair($item, 'answer');
            }
            $parts[] = $part;
        }

        return $parts;
    }

    private function options(array $options, string $prefix): array
    {
        if (count($options) !== 4 || ! array_is_list($options)) {
            throw new DomainException('Objective question requires exactly four ordered options.');
        }
        $rows = [];
        $correct = null;
        foreach ($options as $index => $option) {
            if (! is_array($option)) {
                throw new DomainException('Objective option is malformed.');
            }
            $id = 'o'.$prefix.'-'.$index;
            $rows[] = ['id' => $id, 'content' => $this->pair($option, 'text')];
            if ($option['is_correct'] ?? false) {
                if ($correct !== null) {
                    throw new DomainException('Objective question has multiple correct options.');
                }
                $correct = $id;
            }
        }
        if ($correct === null) {
            throw new DomainException('Objective answer key is missing.');
        }

        return [$rows, $correct];
    }

    private function part(string $id): array
    {
        return [
            'id' => $id, 'statement' => $this->empty(), 'options' => [],
            'correctOptionId' => null, 'truth' => null,
            'answer' => $this->empty(), 'explanation' => $this->empty(),
        ];
    }

    private function empty(): array
    {
        return ['en' => null, 'ur' => null];
    }

    private function pair(array $content, string $field): array
    {
        return [
            'en' => $this->document($content[$field.'_en'] ?? null),
            'ur' => $this->document($content[$field.'_ur'] ?? null),
        ];
    }

    private function pairIsEmpty(array $pair): bool
    {
        return $pair['en'] === null && $pair['ur'] === null;
    }

    private function requireMedium(array $payload, string $schema, string $medium): void
    {
        $required = in_array($schema, ['OPTIONS_ONLY_OBJECTIVE', 'GROUPED_SUBJECTIVE'], true)
            ? [] : ($schema === 'PASSAGE_OBJECTIVE' ? [$payload['passage']] : [$payload['statement']]);
        if ($schema === 'GROUPED_SUBJECTIVE' && ! $this->pairIsEmpty($payload['passage'])) {
            $required[] = $payload['passage'];
        }
        if (in_array($schema, ['PASSAGE_OBJECTIVE', 'GROUPED_SUBJECTIVE'], true)) {
            foreach ($payload['parts'] as $part) {
                $required[] = $part['statement'];
                if ($schema === 'PASSAGE_OBJECTIVE') {
                    foreach ($part['options'] as $option) {
                        $required[] = $option['content'];
                    }
                }
            }
        } else {
            foreach ($payload['options'] as $option) {
                $required[] = $option['content'];
            }
        }
        foreach ($required as $pair) {
            if (($medium !== 'URDU' && $pair['en'] === null) ||
                ($medium !== 'ENGLISH' && $pair['ur'] === null)) {
                throw new DomainException('Required assignment-medium translation is missing.');
            }
        }
    }

    private function document(mixed $value): ?array
    {
        if ($value === null || trim((string) $value) === '') {
            return null;
        }
        if (! is_string($value) || strlen($value) > 500000) {
            throw new DomainException('Rich content is too large or malformed.');
        }
        if (stripos($value, '<img') === false && stripos($value, '&lt;img') !== false) {
            $decoded = html_entity_decode($value, ENT_QUOTES | ENT_HTML5);
            if (stripos($decoded, '<img') !== false) {
                $value = $decoded;
            }
        }
        if (! str_contains($value, '<')) {
            $text = html_entity_decode($value, ENT_QUOTES | ENT_HTML5);

            return ['type' => 'doc', 'content' => [[
                'type' => 'paragraph', 'content' => [['type' => 'text', 'text' => $text]],
            ]]];
        }
        $previous = libxml_use_internal_errors(true);
        try {
            $dom = new DOMDocument('1.0', 'UTF-8');
            if (! $dom->loadHTML('<?xml encoding="UTF-8"><div>'.$value.'</div>', LIBXML_NONET | LIBXML_NOERROR | LIBXML_NOWARNING)) {
                throw new DomainException('Rich HTML cannot be parsed.');
            }
            $root = $dom->getElementsByTagName('div')->item(0);
            $blocks = $this->blocks($root);
        } finally {
            libxml_clear_errors();
            libxml_use_internal_errors($previous);
        }

        return $blocks === [] || ! $this->meaningful($blocks)
            ? null : ['type' => 'doc', 'content' => $blocks];
    }

    private function scanAssets(mixed $value): void
    {
        if (is_array($value)) {
            foreach ($value as $child) {
                $this->scanAssets($child);
            }

            return;
        }
        if (! is_string($value) || stripos($value, '<img') === false) {
            return;
        }
        $previous = libxml_use_internal_errors(true);
        try {
            $dom = new DOMDocument('1.0', 'UTF-8');
            if ($dom->loadHTML('<?xml encoding="UTF-8"><div>'.$value.'</div>', LIBXML_NONET | LIBXML_NOERROR | LIBXML_NOWARNING)) {
                foreach ($dom->getElementsByTagName('img') as $image) {
                    $src = trim($image->getAttribute('src'));
                    $this->assets['asset-'.hash('sha256', $src)] = $src;
                }
            }
        } finally {
            libxml_clear_errors();
            libxml_use_internal_errors($previous);
        }
    }

    private function validateRich(mixed $value, int $depth, int &$nodes): void
    {
        if (! is_array($value)) {
            return;
        }
        if (isset($value['type'])) {
            if ($depth > 20 || ++$nodes > 6000) {
                throw new DomainException('Rich content exceeds the supported depth or node count.');
            }
            foreach ($value['content'] ?? [] as $child) {
                $this->validateRich($child, $depth + 1, $nodes);
            }

            return;
        }
        foreach ($value as $child) {
            $this->validateRich($child, $depth, $nodes);
        }
    }

    private function meaningful(array $nodes): bool
    {
        foreach ($nodes as $node) {
            if (in_array($node['type'], ['image', 'inlineMath', 'blockMath'], true) ||
                ($node['type'] === 'text' && trim($node['text']) !== '') ||
                $this->meaningful($node['content'] ?? [])) {
                return true;
            }
        }

        return false;
    }

    private function blocks(DOMNode $container): array
    {
        $blocks = [];
        $inline = [];
        $flush = function () use (&$blocks, &$inline): void {
            if ($inline !== []) {
                $blocks[] = ['type' => 'paragraph', 'content' => $inline];
                $inline = [];
            }
        };
        foreach ($container->childNodes as $child) {
            if ($child instanceof DOMElement && $child->hasAttribute('style') && trim($child->getAttribute('style')) !== '') {
                throw new DomainException('Unsupported styled content cannot be dropped.');
            }
            if ($child instanceof DOMElement && in_array(strtolower($child->tagName), ['p', 'div'], true)) {
                $flush();
                $nested = $this->blocks($child);
                $blocks = array_merge($blocks, $nested ?: [['type' => 'paragraph']]);
            } elseif ($child instanceof DOMElement && in_array(strtolower($child->tagName), ['ul', 'ol'], true)) {
                $flush();
                $items = [];
                foreach ($child->childNodes as $li) {
                    if ($li instanceof DOMElement && strtolower($li->tagName) === 'li') {
                        $items[] = ['type' => 'listItem', 'content' => $this->blocks($li)];
                    } elseif (trim($li->textContent) !== '') {
                        throw new DomainException('Unsupported list structure.');
                    }
                }
                $blocks[] = ['type' => strtolower($child->tagName) === 'ol' ? 'orderedList' : 'bulletList', 'content' => $items];
            } elseif ($child instanceof DOMElement && strtolower($child->tagName) === 'table') {
                $flush();
                $blocks[] = $this->table($child);
            } else {
                foreach ($this->inline($child, []) as $node) {
                    if (in_array($node['type'], ['image', 'blockMath'], true)) {
                        $flush();
                        $blocks[] = $node;
                    } else {
                        $inline[] = $node;
                    }
                }
            }
        }
        $flush();

        return $blocks;
    }

    private function table(DOMElement $table): array
    {
        $rows = [];
        foreach ($table->getElementsByTagName('tr') as $tr) {
            $cells = [];
            foreach ($tr->childNodes as $cell) {
                if (! $cell instanceof DOMElement || ! in_array(strtolower($cell->tagName), ['td', 'th'], true)) {
                    continue;
                }
                $attrs = new \stdClass;
                foreach (['colspan', 'rowspan'] as $name) {
                    if ($cell->hasAttribute($name)) {
                        $number = filter_var($cell->getAttribute($name), FILTER_VALIDATE_INT);
                        if ($number === false || $number < 1 || $number > 100) {
                            throw new DomainException('Unsupported table span.');
                        }
                        $attrs->{$name} = $number;
                    }
                }
                $cells[] = ['type' => strtolower($cell->tagName) === 'th' ? 'tableHeader' : 'tableCell',
                    'attrs' => $attrs, 'content' => $this->blocks($cell) ?: [['type' => 'paragraph']]];
            }
            $rows[] = ['type' => 'tableRow', 'content' => $cells];
        }

        return ['type' => 'table', 'content' => $rows];
    }

    private function inline(DOMNode $node, array $marks): array
    {
        if ($node->nodeType === XML_TEXT_NODE) {
            return $node->nodeValue === '' ? [] : [[
                'type' => 'text', 'text' => $node->nodeValue,
            ] + ($marks === [] ? [] : ['marks' => $marks])];
        }
        if (! $node instanceof DOMElement) {
            return [];
        }
        $tag = strtolower($node->tagName);
        if ($node->hasAttribute('style') && trim($node->getAttribute('style')) !== '') {
            throw new DomainException('Unsupported styled content cannot be dropped.');
        }
        if ($tag === 'br') {
            return [['type' => 'hardBreak']];
        }
        if ($tag === 'img') {
            $src = trim($node->getAttribute('src'));
            $id = 'asset-'.hash('sha256', $src);
            $this->assets[$id] = $src;
            $attrs = ['src' => 'testmaker-asset:'.$id];
            foreach (['alt', 'title'] as $name) {
                if ($node->hasAttribute($name)) {
                    if (mb_strlen($node->getAttribute($name)) > 300) {
                        throw new DomainException('Image description exceeds 300 characters.');
                    }
                    $attrs[$name] = $node->getAttribute($name);
                }
            }
            foreach (['width', 'height'] as $name) {
                if ($node->hasAttribute($name)) {
                    $dimension = $node->getAttribute($name);
                    if (! ctype_digit($dimension) || (int) $dimension < 1 || (int) $dimension > 4000) {
                        throw new DomainException('Image dimensions are unsupported.');
                    }
                    $attrs[$name] = (int) $dimension;
                }
            }

            return [['type' => 'image', 'attrs' => $attrs]];
        }
        if ($tag === 'span' && $node->hasAttribute('data-latex')) {
            $latex = trim($node->getAttribute('data-latex'));
            if ($latex === '' || mb_strlen($latex) > 4000) {
                throw new DomainException('Invalid mathematical expression.');
            }

            return [['type' => $node->getAttribute('data-display') === 'block' ? 'blockMath' : 'inlineMath',
                'attrs' => ['latex' => $latex]]];
        }
        $mark = match ($tag) {
            'strong', 'b' => 'bold', 'em', 'i' => 'italic', 'u' => 'underline',
            's', 'strike', 'del' => 'strike', 'sub' => 'subscript', 'sup' => 'superscript',
            default => null,
        };
        if ($mark === null && $tag !== 'span') {
            throw new DomainException('Unsupported rich HTML element: '.$tag.'.');
        }
        if ($tag === 'span' && $node->hasAttribute('style') && trim($node->getAttribute('style')) !== '') {
            throw new DomainException('Unsupported styled text cannot be dropped.');
        }
        if ($mark !== null) {
            $marks[] = ['type' => $mark];
        }
        $output = [];
        foreach ($node->childNodes as $child) {
            $output = array_merge($output, $this->inline($child, $marks));
        }

        return $output;
    }
}
