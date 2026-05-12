<?php
require_once 'config.php';

session_start();

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$action = '';

if ($method === 'GET') {
    $action = $_GET['action'] ?? '';
} elseif ($method === 'POST') {
    $action = $_POST['action'] ?? 'login';
}

match ($action) {
    'check'    => checkSession(),
    'logout'   => logout(),
    'register' => register(),
    default    => login(),
};

function checkSession(): void
{
    if (!empty($_SESSION['user_id'])) {
        jsonResponse([
            'loggedIn' => true,
            'fullname' => $_SESSION['fullname'] ?? 'Student'
        ]);
    }
    jsonResponse(['loggedIn' => false]);
}

function logout(): void
{
    $_SESSION = [];
    session_destroy();
    jsonResponse(['success' => true]);
}

function login(): void
{
    $username = trim($_POST['username'] ?? '');
    $password = $_POST['password'] ?? '';

    if ($username === '' || $password === '') {
        jsonResponse(['success' => false, 'message' => 'Username and password are required.'], 400);
    }

    $db   = getDB();
    $stmt = $db->prepare('SELECT id, fullname, password_hash FROM users WHERE username = ? LIMIT 1');
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password_hash'])) {
        jsonResponse(['success' => false, 'message' => 'Invalid username or password.'], 401);
    }

    $_SESSION['user_id']  = $user['id'];
    $_SESSION['fullname'] = $user['fullname'];

    jsonResponse(['success' => true, 'fullname' => $user['fullname']]);
}

function register(): void
{
    $fullname = trim($_POST['fullname'] ?? '');
    $username = trim($_POST['username'] ?? '');
    $password = $_POST['password'] ?? '';

    if ($fullname === '' || $username === '' || $password === '') {
        jsonResponse(['success' => false, 'message' => 'All fields are required.'], 400);
    }
    if (strlen($username) < 3) {
        jsonResponse(['success' => false, 'message' => 'Username must be at least 3 characters.'], 400);
    }
    if (strlen($password) < 6) {
        jsonResponse(['success' => false, 'message' => 'Password must be at least 6 characters.'], 400);
    }

    $db = getDB();


    $check = $db->prepare('SELECT id FROM users WHERE username = ? LIMIT 1');
    $check->execute([$username]);
    if ($check->fetch()) {
        jsonResponse(['success' => false, 'message' => 'Username already taken.'], 409);
    }

    $hash = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $db->prepare(
        'INSERT INTO users (fullname, username, password_hash, created_at)
        VALUES (?, ?, ?, NOW())'
    );
    $stmt->execute([$fullname, $username, $hash]);
    $userId = (int)$db->lastInsertId();

    $_SESSION['user_id']  = $userId;
    $_SESSION['fullname'] = $fullname;

    jsonResponse(['success' => true, 'fullname' => $fullname], 201);
}