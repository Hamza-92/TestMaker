import OnlineTestEditor from './editor';

type EditorProps = Omit<React.ComponentProps<typeof OnlineTestEditor>, 'mode'>;

export default function CreateOnlineTest(props: EditorProps) {
    return <OnlineTestEditor {...props} mode="create" />;
}

CreateOnlineTest.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Online Tests', href: '/online-tests' },
        { title: 'Create' },
    ],
};
