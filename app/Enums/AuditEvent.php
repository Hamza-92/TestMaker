<?php

namespace App\Enums;

enum AuditEvent: string
{
    case Created  = 'created';
    case Updated  = 'updated';
    case Deleted  = 'deleted';
    case Restored = 'restored';
}
