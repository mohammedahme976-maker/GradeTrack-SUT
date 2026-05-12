<?php


require_once 'config.php';

session_start();

header('Content-Type: application/json');

if (empty($_SESSION['user_id'])) {
    jsonResponse(['success' => false, 'message' => 'Not authenticated.'], 401);
}
$userId = (int)$_SESSION['user_id'];

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $action = $_GET['action'] ?? 'list';
    match ($action) {
        'list'    => listGrades($userId),
        'summary' => subjectSummary($userId),
        default   => jsonResponse(['success' => false, 'message' => 'Unknown action.'], 400),
    };
} elseif ($method === 'POST') {
    $action = $_POST['action'] ?? '';
    match ($action) {
        'add'    => addGrade($userId),
        'edit'   => editGrade($userId),
        'delete' => deleteGrade($userId),
        default  => jsonResponse(['success' => false, 'message' => 'Unknown action.'], 400),
    };
} else {
    jsonResponse(['success' => false, 'message' => 'Method not allowed.'], 405);
}

function listGrades(int $userId): void {
    $db   = getDB();
    $stmt = $db->prepare(
        'SELECT id, subject, assessment_name, mark, total, semester, created_at
        FROM grades
        WHERE user_id = ?
        ORDER BY created_at DESC'
    );
    $stmt->execute([$userId]);
    $rows = $stmt->fetchAll();
    jsonResponse(['success' => true, 'data' => $rows]);
}

function subjectSummary(int $userId): void {
    $db   = getDB();
    $stmt = $db->prepare(
        'SELECT
            subject,
            COUNT(*)            AS count,
            ROUND(AVG(mark / total * 100), 2) AS average_pct
        FROM grades
        WHERE user_id = ?
        GROUP BY subject
        ORDER BY subject'
    );
    $stmt->execute([$userId]);
    $rows = $stmt->fetchAll();
    jsonResponse(['success' => true, 'data' => $rows]);
}

function addGrade(int $userId): void {
    [$subject, $assessment, $mark, $total, $semester] = validateGradeInput();

    $db   = getDB();
    $stmt = $db->prepare(
        'INSERT INTO grades (user_id, subject, assessment_name, mark, total, semester, created_at)
        VALUES (?, ?, ?, ?, ?, ?, NOW())'
    );
    $stmt->execute([$userId, $subject, $assessment, $mark, $total, $semester]);

    jsonResponse(['success' => true, 'id' => (int)$db->lastInsertId()], 201);
}

function editGrade(int $userId): void {
    $id = filter_input(INPUT_POST, 'id', FILTER_VALIDATE_INT);
    if (!$id) jsonResponse(['success' => false, 'message' => 'Invalid grade ID.'], 400);

    [$subject, $assessment, $mark, $total, $semester] = validateGradeInput();

    $db   = getDB();
    $stmt = $db->prepare(
        'UPDATE grades
        SET subject = ?, assessment_name = ?, mark = ?, total = ?, semester = ?
        WHERE id = ? AND user_id = ?'
    );
    $stmt->execute([$subject, $assessment, $mark, $total, $semester, $id, $userId]);

    if ($stmt->rowCount() === 0) {
        jsonResponse(['success' => false, 'message' => 'Grade not found or access denied.'], 404);
    }
    jsonResponse(['success' => true]);
}

function deleteGrade(int $userId): void {
    $id = filter_input(INPUT_POST, 'id', FILTER_VALIDATE_INT);
    if (!$id) jsonResponse(['success' => false, 'message' => 'Invalid grade ID.'], 400);

    $db   = getDB();
    $stmt = $db->prepare('DELETE FROM grades WHERE id = ? AND user_id = ?');
    $stmt->execute([$id, $userId]);

    if ($stmt->rowCount() === 0) {
        jsonResponse(['success' => false, 'message' => 'Grade not found or access denied.'], 404);
    }
    jsonResponse(['success' => true]);
}

function validateGradeInput(): array {
    $subject    = trim($_POST['subject']    ?? '');
    $assessment = trim($_POST['assessment'] ?? '');
    $semester   = filter_input(INPUT_POST, 'semester', FILTER_VALIDATE_INT) ?: 1;

    $mark  = filter_input(INPUT_POST, 'mark',  FILTER_VALIDATE_FLOAT);
    $total = filter_input(INPUT_POST, 'total', FILTER_VALIDATE_FLOAT);

    if ($subject === '')    jsonResponse(['success' => false, 'message' => 'Subject is required.'], 400);
    if ($assessment === '') jsonResponse(['success' => false, 'message' => 'Assessment name is required.'], 400);
    if ($mark  === false || $mark  < 0)  jsonResponse(['success' => false, 'message' => 'Mark must be a non-negative number.'], 400);
    if ($total === false || $total <= 0) jsonResponse(['success' => false, 'message' => 'Total must be a positive number.'], 400);
    if ($mark > $total)    jsonResponse(['success' => false, 'message' => 'Mark cannot exceed Total.'], 400);
    if ($semester < 1 || $semester > 12) $semester = 1;

    return [$subject, $assessment, $mark, $total, $semester];
}