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
                    if ($this->document($oldStatement, 'options-only statement') !== null) {
                        throw new DomainException('Options-only source retains a statement that cannot be discarded.');
                    }
                }
            }
            $content = QuestionTypeSchemaRegistry::contentFromQuestion($question, $effectiveType);
            if ($sourceSchema === 'subjective_standard') {
                if (array_key_exists('items', $content) && ! $this->hasOnlyPlaceholderParts($content)) {
                    throw new DomainException('Standalone source schema retains authored child content that cannot be flattened.');
                }
                foreach (['en', 'ur'] as $language) {
                    $field = 'prompt_'.$language;
                    if ($this->document($content[$field] ?? null, $field) === null) {
                        $intro = $content['intro_'.$language] ?? null;
                        $content[$field] = $this->document($intro, 'intro_'.$language) !== null
                            ? $intro : $question->{'statement_'.$language};
                    }
                    foreach (['answer' => 'answer', 'guidance' => 'description'] as $fieldName => $legacyField) {
                        $field = $fieldName.'_'.$language;
                        if ($this->document($content[$field] ?? null, $field) === null) {
                            $content[$field] = $question->{$legacyField.'_'.$language};
                        }
                    }
                }
            }
            $root = $this->part('q'.$question->id);
            $payload = $root + [
                'version' => 1,
                'groupMode' => 'PARTS',
                'passage' => $this->empty(),
                'shared' => null,
                'parts' => [],
            ];
            if ($schema === 'PASSAGE_OBJECTIVE') {
                $payload['passage'] = $this->pair($content, 'passage');
                $payload['parts'] = $this->parts($question, $content, true);
            } elseif ($schema === 'GROUPED_SUBJECTIVE') {
                $payload['passage'] = $this->pair($content, 'intro');
                if (! $this->pairIsEmpty($payload['passage']) && $this->hasOnlyPlaceholderParts($content)) {
                    // Legacy worksheets keep the complete question in intro and a
                    // single empty editor item. There is no authored child to group.
                    $schema = 'STANDARD_SUBJECTIVE';
                    $payload['statement'] = $payload['passage'];
                    $payload['passage'] = $this->empty();
                    $payload['answer'] = $this->pair([
                        'answer_en' => $content['answer_en'] ?? $question->answer_en,
                        'answer_ur' => $content['answer_ur'] ?? $question->answer_ur,
                    ], 'answer');
                    $payload['explanation'] = $this->pair([
                        'guidance_en' => $content['guidance_en'] ?? $question->description_en,
                        'guidance_ur' => $content['guidance_ur'] ?? $question->description_ur,
                    ], 'guidance');
                    $itemCount = 1;
                } else {
                    $payload['parts'] = $this->parts($question, $content, false);
                    // TestMaker has no explicit passage/multipart flag. Keep authored
                    // groups in PARTS mode rather than inferring it from their text.
                }
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
                } elseif ($schema === 'TRUE_FALSE') {
                    $payload['truth'] = match ($content['correct_boolean'] ?? null) {
                        'true' => true, 'false' => false,
                        default => throw new DomainException('True/false answer is missing or ambiguous.'),
                    };
                } elseif ($sourceSchema === 'subjective_same_statement') {
                    $en = $this->document($content['shared_en'] ?? null, 'shared_en');
                    $ur = $this->document($content['shared_ur'] ?? null, 'shared_ur');
                    if ($en !== null && $ur !== null && $en !== $ur) {
                        throw new DomainException('Different English and Urdu shared content cannot be merged.');
                    }
                    $payload['shared'] = $en ?? $ur;
                    $payload['answer'] = $this->pair($content, 'answer');
                } else {
                    $payload['answer'] = $this->pair($content, 'answer');
                    $payload['explanation'] = $this->pair($content, 'guidance');
                    if ($sourceSchema === 'subjective_standard' && $this->pairIsEmpty($payload['statement']) &&
                        $this->isImageWorksheet($payload['explanation'])) {
                        // Legacy identification worksheets store their only stimulus
                        // in guidance; retain that image as the visible question.
                        $payload['statement'] = $payload['explanation'];
                        $payload['explanation'] = $this->empty();
                    }
                }
            }

            // Export every available translation. TestBase validates the language
            // selected for the destination, which may be one language of BOTH.
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

    private function hasOnlyPlaceholderParts(array $content): bool
    {
        $items = $content['items'] ?? [];
        if (! is_array($items) || ! array_is_list($items) || count($items) > 1) {
            return false;
        }
        foreach ($items as $index => $item) {
            if (! is_array($item) || array_diff(array_keys($item), ['prompt_en', 'prompt_ur', 'answer_en', 'answer_ur']) !== []) {
                return false;
            }
            foreach (['prompt_en', 'prompt_ur', 'answer_en', 'answer_ur'] as $field) {
                if ($this->document($item[$field] ?? null, 'items['.$index.'].'.$field) !== null) {
                    return false;
                }
            }
        }

        return true;
    }

    private function isImageWorksheet(array $pair): bool
    {
        $hasImage = false;
        $check = function (array $node) use (&$check, &$hasImage): bool {
            if ($node['type'] === 'image') {
                $hasImage = true;

                return true;
            }
            if ($node['type'] === 'text') {
                return preg_match('/^[\s\x{00a0}]*$/u', $node['text']) === 1;
            }
            if (! in_array($node['type'], ['doc', 'paragraph', 'hardBreak'], true)) {
                return false;
            }
            foreach ($node['content'] ?? [] as $child) {
                if (! $check($child)) {
                    return false;
                }
            }

            return true;
        };
        foreach ($pair as $document) {
            if ($document !== null && ! $check($document)) {
                return false;
            }
        }

        return $hasImage;
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
            $part['statement'] = $this->pair($item, 'prompt', 'items['.$index.'].');
            if ($this->pairIsEmpty($part['statement'])) {
                throw new DomainException('items['.$index.'].prompt: Grouped item has no statement in either language.');
            }
            if ($objective) {
                [$part['options'], $part['correctOptionId']] = $this->options(
                    (array) ($item['options'] ?? []), 'p'.$question->id.'-'.$index, 'items['.$index.'].options',
                );
            } else {
                $part['answer'] = $this->pair($item, 'answer', 'items['.$index.'].');
            }
            $parts[] = $part;
        }

        return $parts;
    }

    private function options(array $options, string $prefix, string $context = 'options'): array
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
            $rows[] = ['id' => $id, 'content' => $this->pair($option, 'text', $context.'['.$index.'].')];
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

    private function pair(array $content, string $field, string $context = ''): array
    {
        return [
            'en' => $this->document($content[$field.'_en'] ?? null, $context.$field.'_en'),
            'ur' => $this->document($content[$field.'_ur'] ?? null, $context.$field.'_ur'),
        ];
    }

    private function pairIsEmpty(array $pair): bool
    {
        return $pair['en'] === null && $pair['ur'] === null;
    }

    private function document(mixed $value, string $field): ?array
    {
        try {
            return $this->parseDocument($value);
        } catch (DomainException $exception) {
            throw new DomainException($field.': '.$exception->getMessage(), previous: $exception);
        }
    }

    private function parseDocument(mixed $value): ?array
    {
        if ($value === null) {
            return null;
        }
        if (! is_string($value) || strlen($value) > 500000) {
            throw new DomainException('Rich content is too large or malformed.');
        }
        if (trim($value) === '') {
            return null;
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

    private function blocks(DOMNode $container, array $marks = []): array
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
            if ($child instanceof DOMElement && in_array(strtolower($child->tagName), ['p', 'div'], true)) {
                $flush();
                [$childMarks] = $this->formatting($child, $marks);
                $nested = $this->blocks($child, $childMarks);
                $blocks = array_merge($blocks, $nested ?: [['type' => 'paragraph']]);
            } elseif ($child instanceof DOMElement && in_array(strtolower($child->tagName), ['ul', 'ol'], true)) {
                $flush();
                [$listMarks] = $this->formatting($child, $marks);
                $items = [];
                foreach ($child->childNodes as $li) {
                    if ($li instanceof DOMElement && strtolower($li->tagName) === 'li') {
                        [$itemMarks] = $this->formatting($li, $listMarks);
                        $items[] = ['type' => 'listItem', 'content' => $this->blocks($li, $itemMarks) ?: [['type' => 'paragraph']]];
                    } elseif (trim($li->textContent) !== '') {
                        throw new DomainException('Unsupported list structure.');
                    }
                }
                $list = ['type' => strtolower($child->tagName) === 'ol' ? 'orderedList' : 'bulletList', 'content' => $items];
                if ($list['type'] === 'orderedList') {
                    $attrs = [];
                    if ($child->hasAttribute('start')) {
                        $start = filter_var($child->getAttribute('start'), FILTER_VALIDATE_INT);
                        if ($start === false || $start < 1 || $start > 100) {
                            throw new DomainException('Unsupported ordered-list start.');
                        }
                        $attrs['start'] = $start;
                    }
                    if ($child->hasAttribute('type')) {
                        if ($child->getAttribute('type') !== '1') {
                            throw new DomainException('Unsupported ordered-list type.');
                        }
                        $attrs['type'] = '1';
                    }
                    if ($attrs !== []) {
                        $list['attrs'] = $attrs;
                    }
                }
                $blocks[] = $list;
            } elseif ($child instanceof DOMElement && strtolower($child->tagName) === 'table') {
                $flush();
                $blocks[] = $this->table($child, $marks);
            } else {
                foreach ($this->inline($child, $marks) as $node) {
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

    private function table(DOMElement $table, array $marks): array
    {
        [$marks] = $this->formatting($table, $marks);
        $rows = [];
        foreach ($table->getElementsByTagName('tr') as $tr) {
            if ($tr->parentNode !== $table && $tr->parentNode?->parentNode !== $table) {
                throw new DomainException('Nested tables are unsupported.');
            }
            $rowMarks = $marks;
            if ($tr->parentNode instanceof DOMElement && $tr->parentNode !== $table) {
                [$rowMarks] = $this->formatting($tr->parentNode, $rowMarks);
            }
            [$rowMarks] = $this->formatting($tr, $rowMarks);
            $cells = [];
            foreach ($tr->childNodes as $cell) {
                if (! $cell instanceof DOMElement || ! in_array(strtolower($cell->tagName), ['td', 'th'], true)) {
                    continue;
                }
                [$cellMarks, $cellStyles] = $this->formatting($cell, $rowMarks);
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
                $align = $cellStyles['align'] ?? ($cell->hasAttribute('align') ? strtolower($cell->getAttribute('align')) : null);
                if ($align !== null) {
                    if (! in_array($align, ['left', 'center', 'right'], true)) {
                        throw new DomainException('Unsupported table alignment.');
                    }
                    $attrs->align = $align;
                }
                $cells[] = ['type' => strtolower($cell->tagName) === 'th' ? 'tableHeader' : 'tableCell',
                    'attrs' => $attrs, 'content' => $this->blocks($cell, $cellMarks) ?: [['type' => 'paragraph']]];
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
        $inheritedMarks = $marks;
        $mark = match ($tag) {
            'strong', 'b' => 'bold', 'em', 'i' => 'italic', 'u' => 'underline',
            's', 'strike', 'del' => 'strike', 'sub' => 'subscript', 'sup' => 'superscript',
            default => null,
        };
        if ($mark !== null) {
            $marks = $this->mark($marks, $mark, true);
        }
        [$marks, $styleAttrs] = $this->formatting($node, $marks, $inheritedMarks);
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
                if (isset($styleAttrs[$name]) || $node->hasAttribute($name)) {
                    $dimension = (string) ($styleAttrs[$name] ?? $node->getAttribute($name));
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
        if ($mark === null && $tag !== 'span') {
            throw new DomainException('Unsupported rich HTML element: '.$tag.'.');
        }
        $output = [];
        foreach ($node->childNodes as $child) {
            $output = array_merge($output, $this->inline($child, $marks));
        }

        return $output;
    }

    private function mark(array $marks, string $type, bool $enabled): array
    {
        $marks = array_values(array_filter($marks, fn ($mark) => $mark['type'] !== $type));
        if ($enabled) {
            $marks[] = ['type' => $type];
        }

        return $marks;
    }

    /** Convert only CSS that has an equivalent in the portable rich-text contract. */
    private function formatting(DOMElement $element, array $marks, ?array $inheritedMarks = null): array
    {
        $inheritedTypes = array_column($inheritedMarks ?? $marks, 'type');
        foreach ($element->attributes as $attribute) {
            if (str_starts_with(strtolower($attribute->name), 'on')) {
                throw new DomainException('Unsafe HTML attribute on <'.strtolower($element->tagName).'>.');
            }
        }
        $attrs = [];
        $tag = strtolower($element->tagName);
        foreach (explode(';', $element->getAttribute('style')) as $declaration) {
            if (trim($declaration) === '') {
                continue;
            }
            $parts = explode(':', $declaration, 2);
            $property = strtolower(trim($parts[0]));
            $value = strtolower(trim(preg_replace('/\s*!important\s*$/i', '', $parts[1] ?? '')));
            if ($property === 'font-weight' && in_array($value, ['normal', 'bold', '400', '600', '700', '800', '900'], true)) {
                $marks = $this->mark($marks, 'bold', ! in_array($value, ['normal', '400'], true));
            } elseif ($property === 'font-style' && in_array($value, ['normal', 'italic', 'oblique'], true)) {
                $marks = $this->mark($marks, 'italic', $value !== 'normal');
            } elseif (in_array($property, ['text-decoration', 'text-decoration-line'], true) &&
                preg_match('/^(?:none|(?:underline|line-through)(?:\s+(?:underline|line-through))?)$/', $value)) {
                // Decorations on ancestors continue through descendant inline boxes.
                $marks = $this->mark($marks, 'underline', in_array('underline', $inheritedTypes, true) || str_contains($value, 'underline'));
                $marks = $this->mark($marks, 'strike', in_array('strike', $inheritedTypes, true) || str_contains($value, 'line-through'));
            } elseif ($property === 'vertical-align' && in_array($value, ['sub', 'super', 'baseline'], true)) {
                $marks = $this->mark($marks, 'subscript', in_array('subscript', $inheritedTypes, true) || $value === 'sub');
                $marks = $this->mark($marks, 'superscript', in_array('superscript', $inheritedTypes, true) || $value === 'super');
            } elseif ($tag === 'img' && in_array($property, ['width', 'height'], true) &&
                preg_match('/^([0-9]+)(?:px)?$/', $value, $match) && (int) $match[1] >= 1 && (int) $match[1] <= 4000) {
                $attrs[$property] = (int) $match[1];
            } elseif (in_array($tag, ['td', 'th'], true) && $property === 'text-align' &&
                in_array($value, ['left', 'center', 'right'], true)) {
                $attrs['align'] = $value;
            } else {
                throw new DomainException('Unsupported style on <'.$tag.'>: '.mb_substr($property.': '.$value, 0, 120).'.');
            }
        }

        return [$marks, $attrs];
    }
}
