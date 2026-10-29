import { Editor } from '@tinymce/tinymce-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/tm';
import { questionTextToEditorHtml } from '@/pages/customer/papers/paper-layouts/questions/question-html';

let editorLoadPromise: Promise<void> | null = null;

function loadEditor() {
    editorLoadPromise ??= import('tinymce/tinymce')
        .then(async () => {
            await Promise.all([
                import('tinymce/icons/default'),
                import('tinymce/models/dom'),
                import('tinymce/themes/silver'),
                import('tinymce/plugins/directionality'),
                import('tinymce/plugins/link'),
                import('tinymce/plugins/lists'),
                import('tinymce/plugins/table'),
            ]);
        })
        .catch((error: unknown) => {
            editorLoadPromise = null;

            throw error;
        });

    return editorLoadPromise;
}

export default function QatSyllabusEditor({
    value,
    onChange,
}: {
    value: string;
    onChange: (value: string) => void;
}) {
    const [editorStatus, setEditorStatus] = useState<
        'loading' | 'ready' | 'error'
    >('loading');
    const [loadAttempt, setLoadAttempt] = useState(0);

    useEffect(() => {
        let cancelled = false;
        void loadEditor().then(
            () => {
                if (!cancelled) {
                    setEditorStatus('ready');
                }
            },
            () => {
                if (!cancelled) {
                    setEditorStatus('error');
                }
            },
        );

        return () => {
            cancelled = true;
        };
    }, [loadAttempt]);

    if (editorStatus === 'error') {
        return (
            <div
                role="alert"
                className="flex items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
            >
                Could not load the syllabus editor.
                <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                        setEditorStatus('loading');
                        setLoadAttempt((attempt) => attempt + 1);
                    }}
                >
                    Retry
                </Button>
            </div>
        );
    }

    if (editorStatus === 'loading') {
        return (
            <div
                role="status"
                aria-label="Loading syllabus editor"
                className="h-80 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800"
            />
        );
    }

    return (
        <Editor
            id="qat-syllabus-description"
            licenseKey="gpl"
            value={questionTextToEditorHtml(value)}
            onEditorChange={(html, editor) =>
                onChange(
                    editor.getContent({ format: 'text' }).trim() ||
                        /<table\b/i.test(html)
                        ? html
                        : '',
                )
            }
            init={{
                height: 320,
                menubar: 'edit insert format table',
                branding: false,
                promotion: false,
                toolbar_mode: 'wrap',
                iframe_attrs: { title: 'Syllabus description' },
                skin_url: '/vendor/tinymce/skins/ui/oxide',
                content_css:
                    '/vendor/tinymce/skins/content/default/content.min.css',
                content_style:
                    'body { font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; } table { border-collapse: collapse; max-width: 100%; } td, th { border: 1px solid #cbd5e1; padding: 8px; }',
                plugins: 'directionality link lists table',
                toolbar:
                    'undo redo | blocks | bold italic underline | forecolor backcolor | alignleft aligncenter alignright | bullist numlist | table link | ltr rtl',
                block_formats:
                    'Paragraph=p; Heading 2=h2; Heading 3=h3; Heading 4=h4',
                table_default_attributes: { border: '1' },
                table_default_styles: {
                    width: '100%',
                    'border-collapse': 'collapse',
                },
                paste_data_images: false,
                convert_urls: false,
            }}
        />
    );
}
