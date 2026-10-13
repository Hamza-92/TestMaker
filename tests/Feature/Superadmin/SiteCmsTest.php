<?php

use App\Enums\UserStatus;
use App\Enums\UserType;
use App\Models\SiteMedia;
use App\Models\SitePage;
use App\Models\User;
use App\Support\SiteNavigation;
use App\Support\SitePageContent;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->withoutVite();
    $this->seed(PermissionSeeder::class);
    $this->master = User::factory()->create([
        'user_type' => UserType::SuperAdmin,
        'status' => UserStatus::Active,
        'created_by' => null,
    ]);
});

it('keeps a new page private until publication and sanitizes its rich text', function () {
    $this->actingAs($this->master)->post('/superadmin/site/pages', [
        'title' => 'About TestMaker', 'slug' => 'about-testmaker',
    ])->assertRedirect();
    $page = SitePage::where('slug', 'about-testmaker')->firstOrFail();
    $this->get('/about-testmaker')->assertNotFound();

    $content = SitePageContent::defaults('About TestMaker');
    $content['sections'] = [[
        'id' => 'story', 'type' => 'text', 'title' => 'Our story',
        'body' => '<p>Hello <strong>schools</strong><script>alert(1)</script><a href="javascript:alert(1)">unsafe</a></p>',
        'image_ids' => [], 'button_label' => '', 'button_url' => '', 'visible' => true,
    ]];
    $this->put("/superadmin/site/pages/{$page->id}", [
        'slug' => 'about-testmaker', 'version' => 1, 'publish' => false, 'content' => $content,
    ])->assertRedirect();
    $this->get('/about-testmaker')->assertNotFound();
    $this->get("/superadmin/site/pages/{$page->id}/preview")->assertOk();

    $this->put("/superadmin/site/pages/{$page->id}", [
        'slug' => 'about-testmaker', 'version' => 2, 'publish' => true, 'content' => $content,
    ])->assertRedirect();
    $published = $this->get('/about-testmaker')->assertOk()->viewData('page')['props']['content'];
    expect($published['sections'][0]['body'])->toContain('<strong>schools</strong>')
        ->not->toContain('<script')
        ->not->toContain('javascript:');
    expect($page->fresh()->revisions()->count())->toBe(1);

    $this->put("/superadmin/site/pages/{$page->id}", [
        'slug' => 'new-about-url', 'version' => 3, 'publish' => false, 'content' => $content,
    ])->assertSessionHasErrors('slug');
    $this->get('/about-testmaker')->assertOk();
});

it('rejects reserved URLs and concurrent edits', function () {
    $this->actingAs($this->master)->post('/superadmin/site/pages', [
        'title' => 'Pricing copy', 'slug' => 'pricing',
    ])->assertSessionHasErrors('slug');
    $this->post('/superadmin/site/pages', [
        'title' => 'Our team', 'slug' => 'our-team',
    ])->assertRedirect();
    $page = SitePage::where('slug', 'our-team')->firstOrFail();
    $content = SitePageContent::defaults('Our team');
    $this->put("/superadmin/site/pages/{$page->id}", [
        'slug' => 'our-team', 'version' => 1, 'publish' => false, 'content' => $content,
    ])->assertRedirect();
    $this->put("/superadmin/site/pages/{$page->id}", [
        'slug' => 'our-team', 'version' => 1, 'publish' => true, 'content' => $content,
    ])->assertSessionHasErrors('version');
});

it('publishes navigation only when linked pages are published', function () {
    $this->actingAs($this->master)->get('/superadmin/site/navigation')->assertOk();
    $page = SitePage::create([
        'slug' => 'school-story', 'template' => 'standard',
        'draft_content' => SitePageContent::defaults('School story'),
    ]);
    $items = [[
        'id' => 'story', 'label' => 'Story', 'type' => 'page', 'url' => null,
        'page_id' => $page->id, 'visible' => true, 'children' => [],
    ]];
    $this->put('/superadmin/site/navigation/header', [
        'version' => 1, 'publish' => true, 'items' => $items,
    ])->assertSessionHasErrors('items');
    $page->update(['published_content' => $page->draft_content, 'published_at' => now()]);
    $this->put('/superadmin/site/navigation/header', [
        'version' => 1, 'publish' => true, 'items' => $items,
    ])->assertRedirect();
    expect(SiteNavigation::published()['header'][0]['href'])->toBe('/school-story');
});

it('serves uploaded media and prevents deletion while a page uses it', function () {
    $this->actingAs($this->master)->post('/superadmin/site/media', [
        'image' => UploadedFile::fake()->image('school.png'),
        'alt_text' => 'School building',
    ])->assertRedirect();
    $media = SiteMedia::firstOrFail();
    $this->get("/site-media/{$media->id}")->assertOk()->assertHeader('Content-Type', 'image/png');

    $content = SitePageContent::defaults('Gallery');
    $content['sections'] = [[
        'id' => 'gallery', 'type' => 'gallery', 'title' => 'Photos', 'body' => '',
        'image_ids' => [$media->id], 'button_label' => '', 'button_url' => '', 'visible' => true,
    ]];
    $page = SitePage::create(['slug' => 'school-gallery', 'template' => 'standard', 'draft_content' => $content]);
    $page->delete();
    $this->delete("/superadmin/site/media/{$media->id}")->assertStatus(409);
});

it('keeps rich formatting and local images in responsive columns', function () {
    $upload = $this->actingAs($this->master)->postJson('/superadmin/site/media/editor', [
        'image' => UploadedFile::fake()->image('classroom.png'),
    ])->assertCreated()->assertJsonStructure(['location', 'alt_text']);
    $url = $upload->json('location');
    expect($url)->toMatch('~^/site-media/[0-9]+$~');
    $media = SiteMedia::firstOrFail();

    $content = SitePageContent::defaults('Learning');
    $content['sections'] = [[
        'id' => 'feature', 'type' => 'columns', 'title' => 'Learn together',
        'body' => '', 'image_ids' => [], 'button_label' => '', 'button_url' => '', 'visible' => true,
        'columns' => [
            ['id' => 'copy', 'body' => '<p style="text-align: center; color: #123456">Centered copy</p><script>alert(1)</script>'],
            ['id' => 'photo', 'body' => '<p><img src="'.$url.'" alt="Classroom" style="width: 75%"></p><img src="https://evil.example/image.png" onerror="alert(1)">'],
        ],
    ]];
    $page = SitePage::create(['slug' => 'learning', 'template' => 'standard', 'draft_content' => SitePageContent::defaults('Learning')]);
    $this->put("/superadmin/site/pages/{$page->id}", [
        'slug' => 'learning', 'version' => 1, 'publish' => true, 'content' => $content,
    ])->assertRedirect();

    $columns = $this->get('/learning')->assertOk()->viewData('page')['props']['content']['sections'][0]['columns'];
    expect($columns[0]['body'])->toContain('text-align: center')->toContain('color: #123456')->not->toContain('<script');
    expect($columns[1]['body'])->toContain('src="'.$url.'"')->toContain('width: 75%')->not->toContain('evil.example')->not->toContain('onerror');
    $this->delete("/superadmin/site/media/{$media->id}")->assertStatus(409);
});

it('enforces website permissions on CMS writes', function () {
    $viewer = User::factory()->create([
        'user_type' => UserType::SuperAdmin,
        'status' => UserStatus::Active,
        'created_by' => $this->master->id,
    ]);
    $viewer->syncPermissions(['site_pages.view']);
    $this->actingAs($viewer)->get('/superadmin/site/pages')->assertOk();
    $this->post('/superadmin/site/pages', [
        'title' => 'Private', 'slug' => 'private-page',
    ])->assertForbidden();
    $this->post('/superadmin/site/media', [
        'image' => UploadedFile::fake()->image('photo.png'), 'alt_text' => 'Photo',
    ])->assertForbidden();
    $this->postJson('/superadmin/site/media/editor', [
        'image' => UploadedFile::fake()->image('photo.png'),
    ])->assertForbidden();
});
