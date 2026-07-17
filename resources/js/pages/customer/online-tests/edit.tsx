import OnlineTestEditor from './editor';

type EditorProps = Omit<React.ComponentProps<typeof OnlineTestEditor>, 'mode'>;

export default function EditOnlineTest(props: EditorProps) {
    return <OnlineTestEditor {...props} mode="edit" />;
}

EditOnlineTest.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Online Tests', href: '/online-tests' },
        { title: 'Edit' },
    ],
};
