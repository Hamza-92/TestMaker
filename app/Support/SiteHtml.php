<?php

namespace App\Support;

use DOMDocument;
use DOMElement;
use DOMNode;

class SiteHtml
{
    public static function clean(string $html): string
    {
        $document = new DOMDocument('1.0', 'UTF-8');
        $previous = libxml_use_internal_errors(true);
        $document->loadHTML('<?xml encoding="UTF-8"?><div>'.$html.'</div>', LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);
        libxml_clear_errors();
        libxml_use_internal_errors($previous);

        $root = $document->documentElement;
        if (! $root) {
            return '';
        }

        foreach (iterator_to_array($root->childNodes) as $child) {
            self::cleanNode($child);
        }

        $result = '';
        foreach ($root->childNodes as $child) {
            $result .= $document->saveHTML($child);
        }

        return trim($result);
    }

    public static function mediaIds(string $html): array
    {
        if ($html === '') {
            return [];
        }

        $document = new DOMDocument('1.0', 'UTF-8');
        $previous = libxml_use_internal_errors(true);
        $document->loadHTML('<?xml encoding="UTF-8"?><div>'.$html.'</div>', LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);
        libxml_clear_errors();
        libxml_use_internal_errors($previous);

        $ids = [];
        foreach ($document->getElementsByTagName('img') as $image) {
            if (preg_match('~^/site-media/([1-9][0-9]*)$~', $image->getAttribute('src'), $matches)) {
                $ids[] = (int) $matches[1];
            }
        }

        return array_values(array_unique($ids));
    }

    private static function cleanNode(DOMNode $node): void
    {
        if (! $node instanceof DOMElement) {
            if (! in_array($node->nodeType, [XML_TEXT_NODE], true)) {
                $node->parentNode?->removeChild($node);
            }

            return;
        }

        $tag = strtolower($node->tagName);
        if (in_array($tag, ['script', 'style', 'iframe', 'object', 'embed', 'svg', 'form', 'video', 'audio'], true)) {
            $node->parentNode?->removeChild($node);

            return;
        }

        foreach (iterator_to_array($node->childNodes) as $child) {
            self::cleanNode($child);
        }

        if (! in_array($tag, ['p', 'h2', 'h3', 'strong', 'b', 'em', 'i', 'u', 's', 'span', 'sub', 'sup', 'ul', 'ol', 'li', 'blockquote', 'a', 'br', 'hr', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td'], true)) {
            while ($node->firstChild) {
                $node->parentNode?->insertBefore($node->firstChild, $node);
            }
            $node->parentNode?->removeChild($node);

            return;
        }

        $href = $tag === 'a' ? $node->getAttribute('href') : '';
        $src = $tag === 'img' ? $node->getAttribute('src') : '';
        $alt = $tag === 'img' ? $node->getAttribute('alt') : '';
        $width = $tag === 'img' ? $node->getAttribute('width') : '';
        $colspan = in_array($tag, ['th', 'td'], true) ? $node->getAttribute('colspan') : '';
        $rowspan = in_array($tag, ['th', 'td'], true) ? $node->getAttribute('rowspan') : '';
        $direction = $node->getAttribute('dir');
        $style = $node->getAttribute('style');
        foreach (iterator_to_array($node->attributes) as $attribute) {
            $node->removeAttributeNode($attribute);
        }

        if ($tag === 'img') {
            if (! preg_match('~^/site-media/[1-9][0-9]*$~', $src)) {
                $node->parentNode?->removeChild($node);

                return;
            }
            $node->setAttribute('src', $src);
            $node->setAttribute('alt', mb_substr($alt, 0, 180));
            $node->setAttribute('loading', 'lazy');
            if (preg_match('/^[1-9][0-9]{0,3}$/', $width) && (int) $width <= 1600) {
                $node->setAttribute('width', $width);
            }
        }

        if ($tag === 'a' && preg_match('~^(?:/(?!/)[^\s]*|https://[^\s]+|mailto:[^\s]+|tel:\+?[0-9 -]+|\#[a-zA-Z0-9_-]+)$~i', $href)) {
            $node->setAttribute('href', $href);
            if (str_starts_with(strtolower($href), 'https://')) {
                $node->setAttribute('rel', 'noopener noreferrer');
            }
        }
        if (in_array($direction, ['ltr', 'rtl'], true)) {
            $node->setAttribute('dir', $direction);
        }
        if (in_array($tag, ['th', 'td'], true)) {
            if (preg_match('/^[2-4]$/', $colspan)) {
                $node->setAttribute('colspan', $colspan);
            }
            if (preg_match('/^[2-4]$/', $rowspan)) {
                $node->setAttribute('rowspan', $rowspan);
            }
        }

        $safeStyle = self::cleanStyle($style, $tag);
        if ($safeStyle !== '') {
            $node->setAttribute('style', $safeStyle);
        }
    }

    private static function cleanStyle(string $style, string $tag): string
    {
        $safe = [];
        foreach (explode(';', $style) as $declaration) {
            if (! str_contains($declaration, ':')) {
                continue;
            }
            [$property, $value] = array_map('trim', explode(':', $declaration, 2));
            $property = strtolower($property);
            $value = strtolower($value);

            if ($property === 'text-align' && in_array($tag, ['p', 'h2', 'h3', 'blockquote', 'th', 'td'], true) && in_array($value, ['left', 'center', 'right', 'justify'], true)) {
                $safe[] = 'text-align: '.$value;
            } elseif (in_array($property, ['color', 'background-color'], true) && in_array($tag, ['span', 'p', 'h2', 'h3', 'th', 'td'], true) && preg_match('/^(?:#[0-9a-f]{3}(?:[0-9a-f]{3})?|rgb\(\s*[0-9]{1,3}\s*,\s*[0-9]{1,3}\s*,\s*[0-9]{1,3}\s*\))$/', $value)) {
                $safe[] = $property.': '.$value;
            } elseif ($property === 'font-size' && in_array($tag, ['span', 'p', 'h2', 'h3'], true) && preg_match('/^(?:[89]|[1-4][0-9])(?:px|pt)$/', $value)) {
                $safe[] = 'font-size: '.$value;
            } elseif ($property === 'text-decoration' && $tag === 'span' && in_array($value, ['underline', 'line-through'], true)) {
                $safe[] = 'text-decoration: '.$value;
            } elseif ($property === 'width' && $tag === 'img' && preg_match('/^(?:[1-9][0-9]?|100)%$|^[1-9][0-9]{0,3}px$/', $value)) {
                $safe[] = 'width: '.$value;
            } elseif ($property === 'display' && $tag === 'img' && $value === 'block') {
                $safe[] = 'display: block';
            } elseif (in_array($property, ['margin-left', 'margin-right'], true) && $tag === 'img' && $value === 'auto') {
                $safe[] = $property.': auto';
            }
        }

        return implode('; ', $safe);
    }
}
