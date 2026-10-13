import { Editor } from '@tinymce/tinymce-react';
import 'tinymce/tinymce';
import 'tinymce/icons/default';
import 'tinymce/models/dom';
import 'tinymce/themes/silver';
import 'tinymce/plugins/autolink';
import 'tinymce/plugins/link';
import 'tinymce/plugins/lists';
import 'tinymce/plugins/directionality';

interface Props {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
}

export default function SiteRichEditor({ value, onChange, disabled }: Props) {
    return (
        <Editor
            licenseKey="gpl"
            initialValue={value}
            onEditorChange={onChange}
            disabled={disabled}
            init={{
                height: 320,
                menubar: false,
                branding: false,
                promotion: false,
                skin_url: '/vendor/tinymce/skins/ui/oxide',
                content_css:
                    '/vendor/tinymce/skins/content/default/content.min.css',
                plugins: 'autolink link lists directionality',
                toolbar:
                    'undo redo | blocks | bold italic | bullist numlist | link | ltr rtl',
                block_formats: 'Paragraph=p; Heading 2=h2; Heading 3=h3',
                link_default_target: '_blank',
                link_assume_external_targets: 'https',
            }}
        />
    );
}
