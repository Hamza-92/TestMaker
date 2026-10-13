import { Editor } from '@tinymce/tinymce-react';
import { useRef } from 'react';
import type { Editor as TinyMCEEditor } from 'tinymce';
import type { SiteMediaItem } from '@/types/site-cms';
import 'tinymce/tinymce';
import 'tinymce/icons/default';
import 'tinymce/models/dom';
import 'tinymce/themes/silver';
import 'tinymce/plugins/advlist';
import 'tinymce/plugins/autolink';
import 'tinymce/plugins/charmap';
import 'tinymce/plugins/directionality';
import 'tinymce/plugins/fullscreen';
import 'tinymce/plugins/image';
import 'tinymce/plugins/link';
import 'tinymce/plugins/lists';
import 'tinymce/plugins/table';
import 'tinymce/plugins/wordcount';

interface Props {
    value: string;
    onChange: (value: string) => void;
    media: SiteMediaItem[];
    disabled?: boolean;
}

async function uploadImage(
    file: File,
): Promise<{ location: string; alt_text: string }> {
    if (file.size > 2 * 1024 * 1024) {
        throw new Error('Images must be 2 MB or smaller.');
    }

    const token = document.querySelector<HTMLMetaElement>(
        'meta[name="csrf-token"]',
    )?.content;
    const data = new FormData();
    data.append('image', file);

    const response = await fetch('/superadmin/site/media/editor', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { Accept: 'application/json', 'X-CSRF-TOKEN': token ?? '' },
        body: data,
    });
    const result = (await response.json()) as {
        location?: string;
        alt_text?: string;
        message?: string;
        errors?: Record<string, string[]>;
    };

    if (!response.ok || !result.location) {
        throw new Error(
            result.errors?.image?.[0] ??
                result.message ??
                'Image upload failed.',
        );
    }

    return {
        location: result.location,
        alt_text: result.alt_text ?? file.name,
    };
}

export default function SiteRichEditor({
    value,
    onChange,
    media,
    disabled,
}: Props) {
    const editorRef = useRef<TinyMCEEditor | null>(null);

    function showUploadError(error: unknown) {
        editorRef.current?.notificationManager.open({
            type: 'error',
            text:
                error instanceof Error ? error.message : 'Image upload failed.',
        });
    }

    return (
        <Editor
            licenseKey="gpl"
            initialValue={value}
            onInit={(_event, editor) => {
                editorRef.current = editor;
            }}
            onEditorChange={onChange}
            disabled={disabled}
            init={{
                height: 420,
                menubar: 'edit insert format table',
                branding: false,
                promotion: false,
                toolbar_mode: 'wrap',
                skin_url: '/vendor/tinymce/skins/ui/oxide',
                content_css:
                    '/vendor/tinymce/skins/content/default/content.min.css',
                content_style:
                    'body { font-family: Arial, sans-serif; font-size: 16px; line-height: 1.7; } img { max-width: 100%; height: auto; } table { border-collapse: collapse; } td, th { border: 1px solid #cbd5e1; padding: 8px; }',
                plugins:
                    'advlist autolink charmap directionality fullscreen image link lists table wordcount',
                toolbar:
                    'undo redo | blocks fontsize | bold italic underline strikethrough | forecolor backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image table charmap | ltr rtl | fullscreen',
                block_formats: 'Paragraph=p; Heading 2=h2; Heading 3=h3',
                image_list: media.map((item) => ({
                    title: item.name,
                    value: item.url,
                })),
                convert_urls: false,
                image_caption: false,
                file_picker_types: 'image',
                file_picker_callback: (callback, _value, meta) => {
                    if (meta.filetype !== 'image') {
                        return;
                    }

                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/jpeg,image/png,image/webp';
                    input.onchange = async () => {
                        const file = input.files?.[0];

                        if (!file) {
                            return;
                        }

                        try {
                            const result = await uploadImage(file);
                            callback(result.location, { alt: result.alt_text });
                        } catch (error) {
                            showUploadError(error);
                        }
                    };
                    input.click();
                },
                automatic_uploads: true,
                images_upload_handler: async (blobInfo) => {
                    try {
                        const file = new File(
                            [blobInfo.blob()],
                            blobInfo.filename(),
                            { type: blobInfo.blob().type },
                        );
                        const result = await uploadImage(file);

                        return result.location;
                    } catch (error) {
                        showUploadError(error);

                        throw error;
                    }
                },
                paste_data_images: false,
                link_default_target: '_blank',
                link_assume_external_targets: 'https',
            }}
        />
    );
}
