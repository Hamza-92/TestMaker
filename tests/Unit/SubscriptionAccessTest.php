<?php

use App\Support\SubscriptionAccess;

function accessMaps(): array
{
    return [
        'patternClassMap' => [
            '1' => [10, 11],
            '2' => [12],
        ],
        'classSubjectMap' => [
            '1:10' => [100, 101],
            '1:11' => [],
            '2:12' => [102],
        ],
    ];
}

it('normalizes an explicit full scope back to unrestricted access', function () {
    $scope = [
        '1' => [
            'classes' => [
                '10' => ['subjects' => null],
                '11' => ['subjects' => []],
            ],
        ],
        '2' => [
            'classes' => [
                '12' => ['subjects' => null],
            ],
        ],
    ];

    expect(SubscriptionAccess::normalizeScope($scope, accessMaps()))->toBeNull();
});

it('builds a nested scope from legacy arrays', function () {
    $scope = SubscriptionAccess::scopeFromLegacy(
        patternAccess: [1],
        classAccess: [10],
        subjectAccess: [100],
        maps: accessMaps(),
    );

    expect($scope)->toBe([
        '1' => [
            'classes' => [
                '10' => ['subjects' => [100]],
            ],
        ],
    ]);
});

it('summarizes nested scope ids for compatibility fields', function () {
    $scope = [
        '1' => [
            'classes' => [
                '10' => ['subjects' => [100]],
                '11' => ['subjects' => []],
            ],
        ],
        '2' => [
            'classes' => [
                '12' => ['subjects' => null],
            ],
        ],
    ];

    expect(SubscriptionAccess::summaryIds($scope, accessMaps()))->toBe([
        'pattern_access' => [1, 2],
        'class_access'   => [10, 11, 12],
        'subject_access' => [100, 102],
    ]);
});
