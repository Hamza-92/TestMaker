import { Form, Head, Link } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowRight,
    Building2,
    ClipboardCheck,
    UserRound,
} from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import {
    Button,
    Card,
    Checkbox,
    Input,
    PageHeader,
    Tabs,
} from '@/components/tm';
import { Spinner } from '@/components/ui/spinner';
import { login } from '@/routes';
import { store } from '@/routes/register';

type RegisterProps = {
    trialType: 'standard' | 'qat';
    trialLimit: number;
    trialDurationDays: number;
};

const schoolFields = [
    {
        name: 'school_name',
        label: 'School name',
        type: 'text',
        placeholder: 'Your school or institution',
        autoComplete: 'organization',
        maxLength: 255,
        required: true,
    },
    {
        name: 'city',
        label: 'City',
        type: 'text',
        placeholder: 'City',
        autoComplete: 'address-level2',
        maxLength: 100,
        required: true,
    },
    {
        name: 'province',
        label: 'Province',
        type: 'text',
        placeholder: 'Province',
        autoComplete: 'address-level1',
        maxLength: 100,
        required: true,
    },
    {
        name: 'address',
        label: 'School address',
        type: 'text',
        placeholder: 'Street address',
        autoComplete: 'street-address',
        maxLength: 255,
        required: false,
    },
];

export default function Register({
    trialType,
    trialLimit,
    trialDurationDays,
}: RegisterProps) {
    const [selectedTrial, setSelectedTrial] = useState(trialType);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const isQat = selectedTrial === 'qat';
    const labelClass =
        'block text-xs font-semibold text-slate-700 dark:text-slate-300';
    const fieldClass =
        'aria-invalid:border-rose-500 aria-invalid:focus:ring-rose-500/20';

    return (
        <>
            <Head
                title={
                    isQat ? 'Start your QAT trial' : 'Create your school trial'
                }
            />
            <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
                <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                    <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2.5 rounded-lg font-semibold tracking-tight focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-500"
                            aria-label="TestMaker home"
                        >
                            <span className="flex size-9 items-center justify-center rounded-lg bg-brand-600 text-white">
                                <ClipboardCheck
                                    aria-hidden="true"
                                    className="size-5"
                                />
                            </span>
                            <span className="text-lg">
                                TestMaker
                                <span className="text-xs font-normal text-slate-500">
                                    .pk
                                </span>
                            </span>
                        </Link>
                        <Button asChild variant="ghost">
                            <Link href={isQat ? '/qat' : '/'}>
                                <ArrowLeft aria-hidden="true" />
                                {isQat ? 'QAT papers' : 'Home'}
                            </Link>
                        </Button>
                    </div>
                </header>

                <main className="mx-auto w-full max-w-6xl space-y-5 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
                    <PageHeader
                        title={
                            isQat
                                ? 'Create your QAT school account'
                                : 'Create your school account'
                        }
                        meta={
                            isQat
                                ? `${trialLimit} free papers · ${trialDurationDays}-day trial`
                                : `${trialDurationDays}-day free trial`
                        }
                        actions={
                            <Button asChild variant="secondary">
                                <Link href={login()}>Log in</Link>
                            </Button>
                        }
                    />

                    <Form
                        {...store.form()}
                        resetOnSuccess={['password', 'password_confirmation']}
                        disableWhileProcessing
                        className="space-y-5"
                    >
                        {({ processing, errors }) => (
                            <>
                                <input
                                    type="hidden"
                                    name="trial_type"
                                    value={selectedTrial}
                                />
                                <Card>
                                    <div className="flex flex-wrap items-center justify-between gap-4">
                                        <div>
                                            <h2 className="text-sm font-semibold">
                                                Choose your trial
                                            </h2>
                                            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                                                {isQat
                                                    ? `${trialLimit} QAT papers with automatic and manual generation.`
                                                    : 'Explore standard paper generation for your school.'}
                                            </p>
                                        </div>
                                        <Tabs
                                            items={[
                                                {
                                                    value: 'standard',
                                                    label: 'Standard papers',
                                                },
                                                {
                                                    value: 'qat',
                                                    label: 'QAT papers',
                                                },
                                            ]}
                                            value={selectedTrial}
                                            onChange={setSelectedTrial}
                                        />
                                    </div>
                                    <InputError
                                        message={errors.trial_type}
                                        className="mt-2"
                                    />
                                </Card>

                                <div className="grid items-start gap-5 lg:grid-cols-2">
                                    <Card
                                        padding="none"
                                        aria-labelledby="school-information-title"
                                    >
                                        <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
                                            <span className="flex size-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                                                <Building2
                                                    aria-hidden="true"
                                                    className="size-4"
                                                />
                                            </span>
                                            <h2
                                                id="school-information-title"
                                                className="text-sm font-semibold"
                                            >
                                                School information
                                            </h2>
                                        </div>
                                        <div className="grid gap-4 p-5 sm:grid-cols-2">
                                            {schoolFields.map(
                                                ({ name, label, ...field }) => (
                                                    <div
                                                        key={name}
                                                        className={`space-y-1.5 ${name === 'city' || name === 'province' ? '' : 'sm:col-span-2'}`}
                                                    >
                                                        <label
                                                            htmlFor={name}
                                                            className={
                                                                labelClass
                                                            }
                                                        >
                                                            {label}
                                                            {field.required && (
                                                                <span
                                                                    aria-hidden="true"
                                                                    className="ml-0.5 text-rose-500"
                                                                >
                                                                    *
                                                                </span>
                                                            )}
                                                        </label>
                                                        <Input
                                                            {...field}
                                                            id={name}
                                                            name={name}
                                                            autoFocus={
                                                                name ===
                                                                'school_name'
                                                            }
                                                            aria-invalid={Boolean(
                                                                errors[name],
                                                            )}
                                                            aria-describedby={
                                                                errors[name]
                                                                    ? `${name}-error`
                                                                    : undefined
                                                            }
                                                            className={
                                                                fieldClass
                                                            }
                                                        />
                                                        <InputError
                                                            id={`${name}-error`}
                                                            message={
                                                                errors[name]
                                                            }
                                                        />
                                                    </div>
                                                ),
                                            )}
                                        </div>
                                    </Card>

                                    <Card
                                        padding="none"
                                        aria-labelledby="account-owner-title"
                                    >
                                        <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
                                            <span className="flex size-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                                                <UserRound
                                                    aria-hidden="true"
                                                    className="size-4"
                                                />
                                            </span>
                                            <h2
                                                id="account-owner-title"
                                                className="text-sm font-semibold"
                                            >
                                                Account owner
                                            </h2>
                                        </div>
                                        <div className="grid gap-4 p-5 sm:grid-cols-2">
                                            <div className="space-y-1.5 sm:col-span-2">
                                                <label
                                                    htmlFor="name"
                                                    className={labelClass}
                                                >
                                                    Full name
                                                    <span
                                                        aria-hidden="true"
                                                        className="ml-0.5 text-rose-500"
                                                    >
                                                        *
                                                    </span>
                                                </label>
                                                <Input
                                                    id="name"
                                                    name="name"
                                                    autoComplete="name"
                                                    placeholder="Your full name"
                                                    maxLength={255}
                                                    required
                                                    aria-invalid={Boolean(
                                                        errors.name,
                                                    )}
                                                    aria-describedby={
                                                        errors.name
                                                            ? 'name-error'
                                                            : undefined
                                                    }
                                                    className={fieldClass}
                                                />
                                                <InputError
                                                    id="name-error"
                                                    message={errors.name}
                                                />
                                            </div>
                                            <div className="space-y-1.5 sm:col-span-2">
                                                <label
                                                    htmlFor="phone"
                                                    className={labelClass}
                                                >
                                                    Phone number
                                                    <span
                                                        aria-hidden="true"
                                                        className="ml-0.5 text-rose-500"
                                                    >
                                                        *
                                                    </span>
                                                </label>
                                                <Input
                                                    id="phone"
                                                    name="phone"
                                                    type="tel"
                                                    inputMode="tel"
                                                    autoComplete="tel"
                                                    placeholder="03xx xxxxxxx"
                                                    minLength={7}
                                                    maxLength={30}
                                                    required
                                                    aria-invalid={Boolean(
                                                        errors.phone,
                                                    )}
                                                    aria-describedby={
                                                        errors.phone
                                                            ? 'phone-error phone-hint'
                                                            : 'phone-hint'
                                                    }
                                                    className={fieldClass}
                                                />
                                                <p
                                                    id="phone-hint"
                                                    className="text-xs leading-5 text-slate-500 dark:text-slate-400"
                                                >
                                                    Use this number to log in to
                                                    your account.
                                                </p>
                                                <InputError
                                                    id="phone-error"
                                                    message={errors.phone}
                                                />
                                            </div>
                                            <div className="space-y-1.5 sm:col-span-2">
                                                <label
                                                    htmlFor="email"
                                                    className={labelClass}
                                                >
                                                    Email address
                                                </label>
                                                <Input
                                                    id="email"
                                                    name="email"
                                                    type="email"
                                                    autoComplete="email"
                                                    placeholder="you@school.com"
                                                    maxLength={255}
                                                    aria-invalid={Boolean(
                                                        errors.email,
                                                    )}
                                                    aria-describedby={
                                                        errors.email
                                                            ? 'email-error'
                                                            : undefined
                                                    }
                                                    className={fieldClass}
                                                />
                                                <InputError
                                                    id="email-error"
                                                    message={errors.email}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label
                                                    htmlFor="password"
                                                    className={labelClass}
                                                >
                                                    Password
                                                    <span
                                                        aria-hidden="true"
                                                        className="ml-0.5 text-rose-500"
                                                    >
                                                        *
                                                    </span>
                                                </label>
                                                <PasswordInput
                                                    appearance="customer"
                                                    id="password"
                                                    name="password"
                                                    autoComplete="new-password"
                                                    placeholder="At least 3 characters"
                                                    minLength={3}
                                                    required
                                                    aria-invalid={Boolean(
                                                        errors.password,
                                                    )}
                                                    aria-describedby={
                                                        errors.password
                                                            ? 'password-error'
                                                            : undefined
                                                    }
                                                    className={fieldClass}
                                                />
                                                <InputError
                                                    id="password-error"
                                                    message={errors.password}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label
                                                    htmlFor="password_confirmation"
                                                    className={labelClass}
                                                >
                                                    Confirm password
                                                    <span
                                                        aria-hidden="true"
                                                        className="ml-0.5 text-rose-500"
                                                    >
                                                        *
                                                    </span>
                                                </label>
                                                <PasswordInput
                                                    appearance="customer"
                                                    id="password_confirmation"
                                                    name="password_confirmation"
                                                    autoComplete="new-password"
                                                    placeholder="Repeat your password"
                                                    minLength={3}
                                                    required
                                                    aria-invalid={Boolean(
                                                        errors.password_confirmation,
                                                    )}
                                                    aria-describedby={
                                                        errors.password_confirmation
                                                            ? 'password-confirmation-error'
                                                            : undefined
                                                    }
                                                    className={fieldClass}
                                                />
                                                <InputError
                                                    id="password-confirmation-error"
                                                    message={
                                                        errors.password_confirmation
                                                    }
                                                />
                                            </div>
                                        </div>
                                    </Card>
                                </div>

                                <Card>
                                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="max-w-xl space-y-2">
                                            <div className="flex items-start gap-2.5">
                                                <Checkbox
                                                    id="terms"
                                                    name="terms"
                                                    required
                                                    checked={termsAccepted}
                                                    onCheckedChange={
                                                        setTermsAccepted
                                                    }
                                                    label="Accept trial terms"
                                                    className="mt-0.5"
                                                    aria-describedby={
                                                        errors.terms
                                                            ? 'terms-error'
                                                            : undefined
                                                    }
                                                />
                                                <label
                                                    htmlFor="terms"
                                                    className="cursor-pointer text-xs leading-5 text-slate-600 dark:text-slate-400"
                                                >
                                                    I agree to use TestMaker
                                                    responsibly and understand
                                                    that the trial can be ended
                                                    at any time.
                                                </label>
                                            </div>
                                            <InputError
                                                id="terms-error"
                                                message={errors.terms}
                                            />
                                        </div>
                                        <Button
                                            type="submit"
                                            variant="primary"
                                            disabled={processing}
                                            data-test="register-user-button"
                                            className="w-full sm:w-auto"
                                        >
                                            {processing ? (
                                                <Spinner />
                                            ) : (
                                                <ArrowRight aria-hidden="true" />
                                            )}
                                            {isQat
                                                ? 'Start QAT trial'
                                                : `Start ${trialDurationDays}-day trial`}
                                        </Button>
                                    </div>
                                </Card>
                            </>
                        )}
                    </Form>
                </main>
            </div>
        </>
    );
}

Register.layout = null;
