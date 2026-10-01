// Automated Test Script for Mini Reading Tracker Requirements
// Tests all business rules and endpoints specified in README.reading-tracker.pdf

const BACKEND_BASE = 'http://localhost:3000/api';

const results = [];

function assert(condition, message) {
  if (!condition) {
    throw new Error(`FAILED: ${message}`);
  }
}

async function runTest(testName, fn) {
  try {
    await fn();
    results.push({ name: testName, status: 'PASSED' });
    console.log(`[PASS] ${testName}`);
  } catch (err) {
    results.push({ name: testName, status: 'FAILED', error: err.message });
    console.error(`[FAIL] ${testName}: ${err.message}`);
  }
}

async function request(path, options = {}) {
  const url = `${BACKEND_BASE}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const contentType = res.headers.get('content-type') || '';
  let data = null;
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }
  return { status: res.status, ok: res.ok, data };
}

async function main() {
  console.log('=== STARTING AUTOMATED TEST SUITE ===');
  console.log(`Target Backend: ${BACKEND_BASE}`);

  // Test 1: Health / Server running
  await runTest('1. Backend Server is Alive & Responding', async () => {
    const res = await request('/library/stats');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data && res.data.success === true, 'Response must have success: true');
    assert(typeof res.data.data.total === 'number', 'Stats must return total count');
  });

  // Test 2: Search Books via Proxy (Open Library)
  await runTest('2. Màn hình 1 - Tìm kiếm sách qua Backend Proxy (GET /api/books/search)', async () => {
    const res = await request('/books/search?q=harry%20potter&page=1&limit=5');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.success === true, 'Response must be success');
    const searchData = res.data.data;
    assert(Array.isArray(searchData.items), 'items must be an array');
    assert(searchData.items.length > 0, 'Search should return items');
    const first = searchData.items[0];
    assert(typeof first.openLibraryId === 'string', 'Item must have openLibraryId');
    assert(typeof first.title === 'string', 'Item must have title');
    console.log(`   Sample book found: "${first.title}" (${first.openLibraryId})`);
  });

  // Test 3: Get Book Detail via Proxy
  await runTest('3. Màn hình 2 - Chi tiết tác phẩm qua Backend Proxy (GET /api/books/:id)', async () => {
    const res = await request('/books/OL82563W');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const detail = res.data.data;
    assert(detail.title && detail.title.length > 0, 'Book detail must have title');
    assert(Array.isArray(detail.subjects), 'subjects must be an array');
    console.log(`   Detail retrieved for "${detail.title}", Total pages: ${detail.totalPages}`);
  });

  // Test 4: Màn hình 3 - Lấy danh sách tủ sách & Stats
  await runTest('4. Màn hình 3 - Lấy danh sách tủ sách và thống kê (GET /api/library & /api/library/stats)', async () => {
    const listRes = await request('/library');
    assert(listRes.status === 200, `Expected 200, got ${listRes.status}`);
    assert(Array.isArray(listRes.data.data), 'Library entries must be an array');

    const statsRes = await request('/library/stats');
    assert(statsRes.status === 200, `Expected 200, got ${statsRes.status}`);
    const stats = statsRes.data.data;
    assert(stats.total >= 0, 'Stats total >= 0');
    assert(stats.wantToRead >= 0, 'Stats wantToRead >= 0');
    assert(stats.reading >= 0, 'Stats reading >= 0');
    assert(stats.read >= 0, 'Stats read >= 0');
    console.log(`   Current Stats: Total=${stats.total}, Reading=${stats.reading}, Read=${stats.read}, Want=${stats.wantToRead}`);
  });

  // Test 5: Business Rule 1 - Thêm sách mới & Chống thêm trùng (409 Conflict)
  let testEntryId = null;
  const testBookOLId = `/works/TEST_${Date.now()}`;
  await runTest('5. Quy tắc nghiệp vụ 1: Thêm sách & Chống thêm trùng sách (409 Conflict)', async () => {
    // 5.1 Thêm mới
    const addRes = await request('/library', {
      method: 'POST',
      body: JSON.stringify({
        openLibraryId: testBookOLId,
        title: 'Sách Kiểm Thử Tự Động',
        authorName: 'Tester AI',
        coverUrl: 'https://covers.openlibrary.org/b/id/7222246-L.jpg',
        totalPages: 200,
        status: 'want_to_read',
      }),
    });
    assert(addRes.status === 201, `Expected 201 Created, got ${addRes.status}`);
    assert(addRes.data.success === true, 'Add book must succeed');
    testEntryId = addRes.data.data.id;
    assert(testEntryId > 0, 'Must return created entry with id');

    // 5.2 Thêm lại chính sách đó -> Mong đợi 409 Conflict
    const dupRes = await request('/library', {
      method: 'POST',
      body: JSON.stringify({
        openLibraryId: testBookOLId,
        title: 'Sách Kiểm Thử Tự Động (Trùng)',
      }),
    });
    assert(dupRes.status === 409, `Expected 409 Conflict, got ${dupRes.status}`);
    assert(dupRes.data.success === false, 'Duplicate add must have success: false');
    console.log(`   Correctly rejected duplicate with HTTP 409: "${dupRes.data.message}"`);
  });

  // Test 6: Business Rule 2 & Validation - Số trang đang đọc >= 0 và <= tổng số trang
  await runTest('6. Quy tắc nghiệp vụ 2: Kiểm tra pagesRead (>= 0 và <= total_pages)', async () => {
    assert(testEntryId, 'testEntryId required');

    // 6.1: pagesRead âm (< 0) -> Phải bị từ chối
    const negRes = await request(`/library/${testEntryId}`, {
      method: 'PATCH',
      body: JSON.stringify({ pagesRead: -10 }),
    });
    assert(!negRes.ok, `Negative pagesRead must fail, got status ${negRes.status}`);

    // 6.2: pagesRead > totalPages (200) -> Phải bị từ chối
    const overRes = await request(`/library/${testEntryId}`, {
      method: 'PATCH',
      body: JSON.stringify({ pagesRead: 250 }),
    });
    assert(!overRes.ok, `pagesRead exceeding totalPages must fail, got status ${overRes.status}`);
    console.log(`   Correctly rejected pagesRead: -10 and pagesRead: 250 (totalPages=200)`);
  });

  // Test 7: Business Rule 3 - Điểm đánh giá là số nguyên từ 1 đến 5 hoặc null
  await runTest('7. Quy tắc nghiệp vụ 3: Rating phải từ 1 đến 5 hoặc null', async () => {
    assert(testEntryId, 'testEntryId required');

    // Rating > 5 -> Thất bại
    const invalidRatingRes = await request(`/library/${testEntryId}`, {
      method: 'PATCH',
      body: JSON.stringify({ rating: 7 }),
    });
    assert(!invalidRatingRes.ok, `Rating 7 must fail, got status ${invalidRatingRes.status}`);

    // Rating = 0 -> Thất bại
    const zeroRatingRes = await request(`/library/${testEntryId}`, {
      method: 'PATCH',
      body: JSON.stringify({ rating: 0 }),
    });
    assert(!zeroRatingRes.ok, `Rating 0 must fail, got status ${zeroRatingRes.status}`);

    // Rating = 5 & ghi chú -> Thành công
    const validRatingRes = await request(`/library/${testEntryId}`, {
      method: 'PATCH',
      body: JSON.stringify({ rating: 5, notes: 'Sách rất hay, kiểm thử đạt yêu cầu!' }),
    });
    assert(validRatingRes.ok, `Rating 5 must succeed, got status ${validRatingRes.status}`);
    assert(validRatingRes.data.data.rating === 5, 'Rating must be 5');
    assert(validRatingRes.data.data.notes === 'Sách rất hay, kiểm thử đạt yêu cầu!', 'Notes must match');
  });

  // Test 8: Business Rule 5 - Khi chuyển sang "reading" lần đầu -> ghi nhận started_at
  await runTest('8. Quy tắc nghiệp vụ 5: Chuyển sang "reading" lần đầu -> tự động ghi nhận started_at', async () => {
    assert(testEntryId, 'testEntryId required');

    const updateRes = await request(`/library/${testEntryId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'reading', pagesRead: 50 }),
    });
    assert(updateRes.ok, `Status reading update must succeed, got status ${updateRes.status}`);
    const entry = updateRes.data.data;
    assert(entry.status === 'reading', 'Status must be reading');
    assert(entry.startedAt !== null, 'startedAt must be recorded on first transition to reading');
    console.log(`   startedAt recorded: ${entry.startedAt}`);
  });

  // Test 9: Business Rule 4 - Khi pagesRead == totalPages -> tự động chuyển sang "read" và ghi nhận finished_at
  await runTest('9. Quy tắc nghiệp vụ 4: Khi pagesRead == totalPages -> Tự động chuyển sang "read" & ghi nhận finished_at', async () => {
    assert(testEntryId, 'testEntryId required');

    const finishRes = await request(`/library/${testEntryId}`, {
      method: 'PATCH',
      body: JSON.stringify({ pagesRead: 200 }), // totalPages = 200
    });
    assert(finishRes.ok, `Updating pagesRead to 200 must succeed, got status ${finishRes.status}`);
    const entry = finishRes.data.data;
    assert(entry.status === 'read', `Expected status to auto-transition to "read", got "${entry.status}"`);
    assert(entry.finishedAt !== null, 'finishedAt must be recorded when completed');
    console.log(`   Auto-transition succeeded: status="${entry.status}", finishedAt=${entry.finishedAt}`);
  });

  // Test 10: Xóa khỏi tủ sách (DELETE /api/library/:id)
  await runTest('10. Màn hình 3 - Xóa sách khỏi tủ sách (DELETE /api/library/:id)', async () => {
    assert(testEntryId, 'testEntryId required');

    const delRes = await request(`/library/${testEntryId}`, {
      method: 'DELETE',
    });
    assert(delRes.status === 204 || delRes.status === 200, `Expected 204 No Content, got ${delRes.status}`);

    // Kiểm tra không còn trong tủ
    const getRes = await request(`/library`);
    const exists = getRes.data.data.some((item) => item.id === testEntryId);
    assert(!exists, 'Deleted book must not exist in library');
    console.log(`   Successfully deleted test entry #${testEntryId}`);
  });

  // Test 11: Lọc theo 3 tab (want_to_read, reading, read)
  await runTest('11. Màn hình 3 - 3 tab lọc theo trạng thái (status query)', async () => {
    const r1 = await request('/library?status=want_to_read');
    assert(r1.ok && r1.data.data.every((e) => e.status === 'want_to_read'), 'All items in tab 1 must be want_to_read');

    const r2 = await request('/library?status=reading');
    assert(r2.ok && r2.data.data.every((e) => e.status === 'reading'), 'All items in tab 2 must be reading');

    const r3 = await request('/library?status=read');
    assert(r3.ok && r3.data.data.every((e) => e.status === 'read'), 'All items in tab 3 must be read');
  });

  console.log('\n=== TEST SUITE RESULTS SUMMARY ===');
  const passed = results.filter((r) => r.status === 'PASSED').length;
  const failed = results.filter((r) => r.status === 'FAILED').length;
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Unhandled test failure:', err);
  process.exit(1);
});
