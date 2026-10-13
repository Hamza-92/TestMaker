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

    private static function cleanNode(DOMNode $node): void
    {
        if (! $node instanceof DOMElement) {
            if (! in_array($node->nodeType, [XML_TEXT_NODE], true)) {
                $node->parentNode?->removeChild($node);
            }

            return;
        }

        $tag = strtolower($node->tagName);
        if (in_array($tag, ['script', 'style', 'iframe', 'object', 'embed', 'svg', 'form'], true)) {
            $node->parentNode?->removeChild($node);

            return;
        }

        foreach (iterator_to_array($node->childNodes) as $child) {
            self::cleanNode($child);
        }

        if (! in_array($tag, ['p', 'h2', 'h3', 'strong', 'b', 'em', 'i', 'ul', 'ol', 'li', 'blockquote', 'a', 'br'], true)) {
            while ($node->firstChild) {
                $node->parentNode?->insertBefore($node->firstChild, $node);
            }
            $node->parentNode?->removeChild($node);

            return;
        }

        $href = $tag === 'a' ? $node->getAttribute('href') : '';
        $direction = $node->getAttribute('dir');
        foreach (iterator_to_array($node->attributes) as $attribute) {
            $node->removeAttributeNode($attribute);
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
    }
}
