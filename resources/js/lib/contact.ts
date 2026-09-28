export const CONTACT_EMAIL = 'testmakerofficial@gmail.com';

export const CONTACT_PHONES = [
    { display: '0346-4688434', tel: '+923464688434', whatsapp: '923464688434' },
    { display: '0309-4688484', tel: '+923094688484', whatsapp: '923094688484' },
] as const;

export const PUBLIC_CONTACT_PHONES = [
    ...CONTACT_PHONES,
    { display: '0303-4688484', tel: '+923034688484', whatsapp: '923034688484' },
] as const;
