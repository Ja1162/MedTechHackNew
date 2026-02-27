"""
Intinn - Cognitive Vital Sign Tracker
Flask Backend with WebSocket support, SQLite, Auth, Assessments, Games, Caregiver Dashboard
"""

#─────────────────────────────────────────────
#Importing flask and other necesary libraries
#─────────────────────────────────────────────
from flask import Flask, request, jsonify, g
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_cors import CORS
import sqlite3
import hashlib
import secrets
import json
import time
import math
from datetime import datetime, timedelta
from functools import wraps

# ─────────────────────────────────────────────
# App Setup
# ─────────────────────────────────────────────
app = Flask(__name__)
app.config['SECRET_KEY'] = secrets.token_hex(32)
app.config['DATABASE'] = 'intinn.db'

CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')


# ─────────────────────────────────────────────
# Database
# ─────────────────────────────────────────────
def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(app.config['DATABASE'])
        db.row_factory = sqlite3.Row
    return db

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

def init_db():
    with app.app_context():
        db = sqlite3.connect(app.config['DATABASE'])
        db.row_factory = sqlite3.Row
        db.executescript("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                token TEXT,
                age INTEGER,
                created_at TEXT DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS caregivers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                caregiver_user_id INTEGER NOT NULL,
                patient_user_id INTEGER NOT NULL,
                approved INTEGER DEFAULT 0,
                FOREIGN KEY(caregiver_user_id) REFERENCES users(id),
                FOREIGN KEY(patient_user_id) REFERENCES users(id),
                UNIQUE(caregiver_user_id, patient_user_id)
            );

            CREATE TABLE IF NOT EXISTS assessment_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                domain TEXT NOT NULL,
                score REAL NOT NULL,
                raw_data TEXT,
                duration_seconds INTEGER,
                created_at TEXT DEFAULT (datetime('now')),
                FOREIGN KEY(user_id) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS baselines (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                domain TEXT NOT NULL,
                mean REAL,
                std_dev REAL,
                sample_count INTEGER DEFAULT 0,
                updated_at TEXT DEFAULT (datetime('now')),
                UNIQUE(user_id, domain)
            );

            CREATE TABLE IF NOT EXISTS game_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                game_type TEXT NOT NULL,
                score INTEGER NOT NULL,
                level INTEGER DEFAULT 1,
                duration_seconds INTEGER,
                created_at TEXT DEFAULT (datetime('now')),
                FOREIGN KEY(user_id) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS wellness_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                sleep_hours REAL,
                mood INTEGER,
                exercise_minutes INTEGER,
                notes TEXT,
                logged_date TEXT DEFAULT (date('now')),
                FOREIGN KEY(user_id) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS caregiver_notes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                caregiver_user_id INTEGER NOT NULL,
                patient_user_id INTEGER NOT NULL,
                note TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now'))
            );
        """)
        db.commit()
        db.close()
    print("✅ Database initialised")


# ─────────────────────────────────────────────
# Auth Helpers
# ─────────────────────────────────────────────
def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not token:
            return jsonify({'error': 'Missing token'}), 401
        db = get_db()
        user = db.execute('SELECT * FROM users WHERE token = ?', (token,)).fetchone()
        if not user:
            return jsonify({'error': 'Invalid token'}), 401
        g.current_user = dict(user)
        return f(*args, **kwargs)
    return decorated


# ─────────────────────────────────────────────
# Cognitive Domain Config
# ─────────────────────────────────────────────
COGNITIVE_DOMAINS = {
    'memory': {
        'label': 'Short-Term Memory',
        'description': 'Recall sequences and word lists',
        'icon': '🧠'
    },
    'executive': {
        'label': 'Executive Function',
        'description': 'Trail making, planning, inhibition',
        'icon': '🎯'
    },
    'processing_speed': {
        'label': 'Processing Speed',
        'description': 'Quick recognition and reaction',
        'icon': '⚡'
    },
    'language': {
        'label': 'Language & Reasoning',
        'description': 'Word recall, semantic fluency',
        'icon': '💬'
    }
}


# ─────────────────────────────────────────────
# Baseline Engine
# ─────────────────────────────────────────────
def update_baseline(user_id, domain, new_score):
    """Welford's online algorithm for rolling mean/std"""
    db = get_db()
    row = db.execute(
        'SELECT * FROM baselines WHERE user_id=? AND domain=?', (user_id, domain)
    ).fetchone()

    if row is None:
        db.execute(
            'INSERT INTO baselines (user_id, domain, mean, std_dev, sample_count) VALUES (?,?,?,?,?)',
            (user_id, domain, new_score, 0.0, 1)
        )
    else:
        n = row['sample_count'] + 1
        old_mean = row['mean']
        new_mean = old_mean + (new_score - old_mean) / n
        old_std = row['std_dev'] or 0.0
        new_variance = (((n - 2) * old_std**2) + (new_score - old_mean) * (new_score - new_mean)) / max(n - 1, 1)
        new_std = math.sqrt(max(new_variance, 0))
        db.execute(
            'UPDATE baselines SET mean=?, std_dev=?, sample_count=?, updated_at=datetime("now") WHERE user_id=? AND domain=?',
            (new_mean, new_std, n, user_id, domain)
        )
    db.commit()

def get_deviation_flag(user_id, domain, score):
    """Returns alert level: 'normal', 'watch', 'alert'"""
    db = get_db()
    row = db.execute(
        'SELECT * FROM baselines WHERE user_id=? AND domain=?', (user_id, domain)
    ).fetchone()
    if not row or row['sample_count'] < 5:
        return 'building_baseline'
    mean = row['mean']
    std = row['std_dev'] or 1.0
    z = (score - mean) / std
    if z < -2.0:
        return 'alert'
    elif z < -1.0:
        return 'watch'
    return 'normal'


# ─────────────────────────────────────────────
# Assessment Question Bank
# ─────────────────────────────────────────────
ASSESSMENT_QUESTIONS = {
    'memory': [
        {
            'id': 'mem_001',
            'type': 'word_recall',
            'instruction': 'Remember these 5 words. You will be asked to recall them.',
            'words': ['apple', 'river', 'clock', 'purple', 'honesty'],
            'delay_seconds': 30,
            'points': 20
        },
        {
            'id': 'mem_002',
            'type': 'digit_span',
            'instruction': 'Repeat the number sequence forward.',
            'sequences': ['3-8-2', '7-4-9-1', '6-1-5-8-3'],
            'points': 30
        },
        {
            'id': 'mem_003',
            'type': 'story_recall',
            'instruction': 'Read this short passage. Answer questions about it.',
            'passage': 'Mary went to the market on Tuesday. She bought bread, milk, and flowers. On her way home, she met her neighbour John who was walking his dog called Biscuit.',
            'questions': [
                {'q': 'What day did Mary go to the market?', 'answer': 'tuesday'},
                {'q': 'What was the dog\'s name?', 'answer': 'biscuit'},
                {'q': 'How many items did Mary buy?', 'answer': '3'}
            ],
            'points': 30
        }
    ],
    'executive': [
        {
            'id': 'exec_001',
            'type': 'trail_making_a',
            'instruction': 'Connect the numbers 1–10 in order as fast as possible.',
            'nodes': [1,2,3,4,5,6,7,8,9,10],
            'time_limit': 60,
            'points': 30
        },
        {
            'id': 'exec_002',
            'type': 'trail_making_b',
            'instruction': 'Alternate between numbers and letters: 1-A-2-B-3-C...',
            'sequence': ['1','A','2','B','3','C','4','D','5','E'],
            'time_limit': 90,
            'points': 40
        },
        {
            'id': 'exec_003',
            'type': 'stroop',
            'instruction': 'Name the COLOR of the ink, not the word.',
            'items': [
                {'word': 'RED', 'ink': 'blue'},
                {'word': 'GREEN', 'ink': 'red'},
                {'word': 'BLUE', 'ink': 'green'},
                {'word': 'YELLOW', 'ink': 'purple'},
            ],
            'points': 30
        }
    ],
    'processing_speed': [
        {
            'id': 'ps_001',
            'type': 'reaction_time',
            'instruction': 'Tap as quickly as possible when the circle turns green.',
            'trials': 10,
            'points': 40
        },
        {
            'id': 'ps_002',
            'type': 'symbol_match',
            'instruction': 'Match the symbol to its pair as fast as you can.',
            'symbols': ['★', '♦', '●', '▲', '■'],
            'time_limit': 45,
            'points': 30
        }
    ],
    'language': [
        {
            'id': 'lang_001',
            'type': 'category_fluency',
            'instruction': 'Name as many animals as you can in 60 seconds.',
            'category': 'animals',
            'time_limit': 60,
            'scoring': 'count_unique',
            'points': 40
        },
        {
            'id': 'lang_002',
            'type': 'letter_fluency',
            'instruction': 'Name as many words starting with the letter F as you can in 60 seconds.',
            'letter': 'F',
            'time_limit': 60,
            'scoring': 'count_unique',
            'points': 30
        },
        {
            'id': 'lang_003',
            'type': 'naming',
            'instruction': 'What is this object?',
            'items': [
                {'image_hint': 'a device for measuring time with hands', 'answer': 'clock'},
                {'image_hint': 'worn on the wrist', 'answer': 'watch'},
                {'image_hint': 'used to cut paper', 'answer': 'scissors'}
            ],
            'points': 30
        }
    ]
}


# ─────────────────────────────────────────────
# Routes — Auth
# ─────────────────────────────────────────────
@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    required = ['name', 'email', 'password']
    if not all(k in data for k in required):
        return jsonify({'error': 'Missing required fields'}), 400

    db = get_db()
    existing = db.execute('SELECT id FROM users WHERE email=?', (data['email'],)).fetchone()
    if existing:
        return jsonify({'error': 'Email already registered'}), 409

    token = secrets.token_urlsafe(32)
    try:
        db.execute(
            'INSERT INTO users (name, email, password_hash, token, age) VALUES (?,?,?,?,?)',
            (data['name'], data['email'], hash_password(data['password']), token, data.get('age'))
        )
        db.commit()
    except Exception as e:
        return jsonify({'error': str(e)}), 500

    user = db.execute('SELECT * FROM users WHERE email=?', (data['email'],)).fetchone()
    return jsonify({
        'message': 'Welcome to Intinn!',
        'token': token,
        'user': {'id': user['id'], 'name': user['name'], 'email': user['email']}
    }), 201


@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    db = get_db()
    user = db.execute(
        'SELECT * FROM users WHERE email=? AND password_hash=?',
        (data.get('email'), hash_password(data.get('password', '')))
    ).fetchone()
    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401

    new_token = secrets.token_urlsafe(32)
    db.execute('UPDATE users SET token=? WHERE id=?', (new_token, user['id']))
    db.commit()

    return jsonify({
        'token': new_token,
        'user': {'id': user['id'], 'name': user['name'], 'email': user['email']}
    })


@app.route('/api/auth/me', methods=['GET'])
@require_auth
def me():
    return jsonify(g.current_user)


# ─────────────────────────────────────────────
# Routes — Cognitive Domains
# ─────────────────────────────────────────────
@app.route('/api/domains', methods=['GET'])
def get_domains():
    return jsonify(COGNITIVE_DOMAINS)


@app.route('/api/assessment/<domain>/questions', methods=['GET'])
@require_auth
def get_questions(domain):
    if domain not in ASSESSMENT_QUESTIONS:
        return jsonify({'error': 'Unknown domain'}), 404
    return jsonify({
        'domain': domain,
        'domain_info': COGNITIVE_DOMAINS.get(domain, {}),
        'questions': ASSESSMENT_QUESTIONS[domain]
    })


@app.route('/api/assessment/<domain>/submit', methods=['POST'])
@require_auth
def submit_assessment(domain):
    """
    Accepts scored results from the frontend.
    Body: { score: 0-100, raw_data: {...}, duration_seconds: int }
    """
    if domain not in COGNITIVE_DOMAINS:
        return jsonify({'error': 'Unknown domain'}), 404

    data = request.get_json()
    score = float(data.get('score', 0))
    user_id = g.current_user['id']

    db = get_db()
    db.execute(
        'INSERT INTO assessment_sessions (user_id, domain, score, raw_data, duration_seconds) VALUES (?,?,?,?,?)',
        (user_id, domain, score, json.dumps(data.get('raw_data', {})), data.get('duration_seconds', 0))
    )
    db.commit()

    # Update baseline
    update_baseline(user_id, domain, score)
    flag = get_deviation_flag(user_id, domain, score)

    # Fetch baseline for response
    baseline = db.execute(
        'SELECT * FROM baselines WHERE user_id=? AND domain=?', (user_id, domain)
    ).fetchone()

    result = {
        'score': score,
        'domain': domain,
        'flag': flag,
        'message': _flag_message(flag, domain),
        'baseline': {
            'mean': round(baseline['mean'], 1) if baseline else None,
            'std_dev': round(baseline['std_dev'], 1) if baseline else None,
            'sample_count': baseline['sample_count'] if baseline else 0
        }
    }

    # Broadcast to any linked caregivers via WebSocket
    _notify_caregivers(user_id, 'assessment_complete', result)

    return jsonify(result)


def _flag_message(flag, domain):
    messages = {
        'building_baseline': f"We're building your {domain} baseline. Keep going — a few more sessions and we'll start spotting patterns.",
        'normal': "Your performance is within your usual range. Great work!",
        'watch': "A slight dip noted compared to your baseline. This is very common — rest, hydration and stress all play a role.",
        'alert': "This score is notably lower than your personal baseline. We gently recommend discussing this with your GP."
    }
    return messages.get(flag, '')


# ─────────────────────────────────────────────
# Routes — History & Trends
# ─────────────────────────────────────────────
@app.route('/api/history', methods=['GET'])
@require_auth
def get_history():
    db = get_db()
    user_id = g.current_user['id']
    domain = request.args.get('domain')
    days = int(request.args.get('days', 30))
    since = (datetime.now() - timedelta(days=days)).isoformat()

    query = 'SELECT * FROM assessment_sessions WHERE user_id=? AND created_at >= ?'
    params = [user_id, since]
    if domain:
        query += ' AND domain=?'
        params.append(domain)
    query += ' ORDER BY created_at ASC'

    rows = db.execute(query, params).fetchall()
    return jsonify([dict(r) for r in rows])


@app.route('/api/summary', methods=['GET'])
@require_auth
def get_summary():
    """Full cognitive health snapshot for the user."""
    db = get_db()
    user_id = g.current_user['id']

    baselines = db.execute('SELECT * FROM baselines WHERE user_id=?', (user_id,)).fetchall()
    recent = db.execute(
        'SELECT domain, score, created_at FROM assessment_sessions WHERE user_id=? ORDER BY created_at DESC LIMIT 20',
        (user_id,)
    ).fetchall()
    wellness = db.execute(
        'SELECT * FROM wellness_log WHERE user_id=? ORDER BY logged_date DESC LIMIT 7',
        (user_id,)
    ).fetchall()
    games = db.execute(
        'SELECT game_type, MAX(score) as best, AVG(score) as avg FROM game_sessions WHERE user_id=? GROUP BY game_type',
        (user_id,)
    ).fetchall()

    return jsonify({
        'baselines': [dict(b) for b in baselines],
        'recent_assessments': [dict(r) for r in recent],
        'wellness_last_7_days': [dict(w) for w in wellness],
        'game_stats': [dict(g) for g in games]
    })


# ─────────────────────────────────────────────
# Routes — Brain Wellness Games
# ─────────────────────────────────────────────
GAME_CONFIGS = {
    'memory_match': {
        'label': 'Memory Match',
        'description': 'Flip cards and find matching pairs',
        'icon': '🃏',
        'levels': [
            {'level': 1, 'pairs': 6, 'flip_time': 2.0},
            {'level': 2, 'pairs': 8, 'flip_time': 1.5},
            {'level': 3, 'pairs': 10, 'flip_time': 1.0},
        ]
    },
    'maths_speed': {
        'label': 'Maths Speed Drills',
        'description': 'Answer arithmetic problems quickly',
        'icon': '🔢',
        'levels': [
            {'level': 1, 'ops': ['+', '-'], 'max_num': 10, 'time_limit': 30, 'questions': 10},
            {'level': 2, 'ops': ['+', '-', '*'], 'max_num': 20, 'time_limit': 60, 'questions': 15},
            {'level': 3, 'ops': ['+', '-', '*', '/'], 'max_num': 50, 'time_limit': 90, 'questions': 20},
        ]
    },
    'spot_difference': {
        'label': 'Spot the Difference',
        'description': 'Find changes between two scenes',
        'icon': '🔍',
        'levels': [
            {'level': 1, 'differences': 3, 'time_limit': 60},
            {'level': 2, 'differences': 5, 'time_limit': 90},
            {'level': 3, 'differences': 8, 'time_limit': 120},
        ]
    },
    'word_scramble': {
        'label': 'Word Scramble',
        'description': 'Unscramble the letters to find the word',
        'icon': '📝',
        'word_lists': {
            1: ['cat', 'dog', 'hat', 'sun', 'car'],
            2: ['plant', 'chair', 'train', 'music', 'lemon'],
            3: ['blanket', 'journey', 'captain', 'mystery', 'climate']
        }
    },
    'crossword': {
        'label': 'Mini Crossword',
        'description': '5x5 daily crossword puzzle',
        'icon': '✏️',
    }
}

@app.route('/api/games', methods=['GET'])
def get_games():
    return jsonify(GAME_CONFIGS)


@app.route('/api/games/<game_type>/start', methods=['POST'])
@require_auth
def start_game(game_type):
    if game_type not in GAME_CONFIGS:
        return jsonify({'error': 'Unknown game'}), 404

    data = request.get_json() or {}
    level = data.get('level', 1)
    config = GAME_CONFIGS[game_type]

    session_token = secrets.token_urlsafe(16)
    return jsonify({
        'session_token': session_token,
        'game_type': game_type,
        'level': level,
        'config': config,
        'started_at': datetime.now().isoformat()
    })


@app.route('/api/games/<game_type>/submit', methods=['POST'])
@require_auth
def submit_game(game_type):
    data = request.get_json()
    score = int(data.get('score', 0))
    level = int(data.get('level', 1))
    duration = int(data.get('duration_seconds', 0))
    user_id = g.current_user['id']

    db = get_db()
    db.execute(
        'INSERT INTO game_sessions (user_id, game_type, score, level, duration_seconds) VALUES (?,?,?,?,?)',
        (user_id, game_type, score, level, duration)
    )
    db.commit()

    # Leaderboard rank
    rank = db.execute(
        'SELECT COUNT(*)+1 as rank FROM game_sessions WHERE game_type=? AND score > ?',
        (game_type, score)
    ).fetchone()['rank']

    personal_best = db.execute(
        'SELECT MAX(score) as pb FROM game_sessions WHERE user_id=? AND game_type=?',
        (user_id, game_type)
    ).fetchone()['pb']

    is_pb = score >= (personal_best or 0)

    return jsonify({
        'score': score,
        'personal_best': is_pb,
        'global_rank': rank,
        'message': '🏆 New Personal Best!' if is_pb else f'Score saved! Global rank: #{rank}'
    })


@app.route('/api/games/leaderboard', methods=['GET'])
def leaderboard():
    game_type = request.args.get('game_type', 'memory_match')
    db = get_db()
    rows = db.execute("""
        SELECT u.name, gs.score, gs.level, gs.created_at
        FROM game_sessions gs
        JOIN users u ON u.id = gs.user_id
        WHERE gs.game_type = ?
        ORDER BY gs.score DESC
        LIMIT 10
    """, (game_type,)).fetchall()
    return jsonify([dict(r) for r in rows])


# ─────────────────────────────────────────────
# Routes — Wellness Log
# ─────────────────────────────────────────────
@app.route('/api/wellness', methods=['POST'])
@require_auth
def log_wellness():
    data = request.get_json()
    user_id = g.current_user['id']
    db = get_db()

    today = datetime.now().strftime('%Y-%m-%d')
    existing = db.execute(
        'SELECT id FROM wellness_log WHERE user_id=? AND logged_date=?', (user_id, today)
    ).fetchone()

    if existing:
        db.execute("""
            UPDATE wellness_log SET sleep_hours=?, mood=?, exercise_minutes=?, notes=?
            WHERE user_id=? AND logged_date=?
        """, (data.get('sleep_hours'), data.get('mood'), data.get('exercise_minutes'),
              data.get('notes'), user_id, today))
    else:
        db.execute("""
            INSERT INTO wellness_log (user_id, sleep_hours, mood, exercise_minutes, notes, logged_date)
            VALUES (?,?,?,?,?,?)
        """, (user_id, data.get('sleep_hours'), data.get('mood'),
              data.get('exercise_minutes'), data.get('notes'), today))
    db.commit()

    # Generate insight
    insight = _wellness_insight(data)
    return jsonify({'message': 'Wellness log updated', 'insight': insight})


def _wellness_insight(data):
    sleep = data.get('sleep_hours', 0) or 0
    mood = data.get('mood', 5) or 5
    exercise = data.get('exercise_minutes', 0) or 0

    tips = []
    if sleep >= 7:
        tips.append("Great sleep! Research links 7+ hours of sleep to improved memory performance.")
    elif sleep < 5:
        tips.append("Poor sleep can temporarily reduce cognitive performance. Aim for 7–8 hours.")

    if exercise >= 30:
        tips.append("Exercise boosts brain-derived neurotrophic factor (BDNF) — excellent for cognition!")
    elif exercise == 0:
        tips.append("Even a 20-minute walk supports brain health.")

    if mood <= 3:
        tips.append("Low mood can affect concentration. Consider a short mindfulness break.")

    return tips if tips else ["Keep up your healthy routines — consistency is key!"]


@app.route('/api/wellness/history', methods=['GET'])
@require_auth
def wellness_history():
    db = get_db()
    rows = db.execute(
        'SELECT * FROM wellness_log WHERE user_id=? ORDER BY logged_date DESC LIMIT 30',
        (g.current_user['id'],)
    ).fetchall()
    return jsonify([dict(r) for r in rows])


# ─────────────────────────────────────────────
# Routes — Caregiver Dashboard
# ─────────────────────────────────────────────
@app.route('/api/caregiver/invite', methods=['POST'])
@require_auth
def caregiver_invite():
    """Patient invites a caregiver by email."""
    data = request.get_json()
    db = get_db()
    caregiver = db.execute('SELECT id FROM users WHERE email=?', (data.get('email'),)).fetchone()
    if not caregiver:
        return jsonify({'error': 'No user found with that email'}), 404

    patient_id = g.current_user['id']
    try:
        db.execute(
            'INSERT INTO caregivers (caregiver_user_id, patient_user_id, approved) VALUES (?,?,?)',
            (caregiver['id'], patient_id, 1)
        )
        db.commit()
    except sqlite3.IntegrityError:
        return jsonify({'message': 'Caregiver already linked'}), 200

    return jsonify({'message': f"Caregiver linked successfully!"})


@app.route('/api/caregiver/patients', methods=['GET'])
@require_auth
def my_patients():
    """Caregiver sees their patients' summaries."""
    db = get_db()
    caregiver_id = g.current_user['id']

    links = db.execute(
        'SELECT patient_user_id FROM caregivers WHERE caregiver_user_id=? AND approved=1',
        (caregiver_id,)
    ).fetchall()

    summaries = []
    for link in links:
        pid = link['patient_user_id']
        user = db.execute('SELECT id, name, email FROM users WHERE id=?', (pid,)).fetchone()
        recent = db.execute(
            'SELECT domain, score, created_at FROM assessment_sessions WHERE user_id=? ORDER BY created_at DESC LIMIT 5',
            (pid,)
        ).fetchall()
        baselines = db.execute('SELECT * FROM baselines WHERE user_id=?', (pid,)).fetchall()
        wellness = db.execute(
            'SELECT * FROM wellness_log WHERE user_id=? ORDER BY logged_date DESC LIMIT 7',
            (pid,)
        ).fetchall()

        summaries.append({
            'patient': dict(user),
            'recent_assessments': [dict(r) for r in recent],
            'baselines': [dict(b) for b in baselines],
            'wellness_last_7_days': [dict(w) for w in wellness]
        })

    return jsonify(summaries)


@app.route('/api/caregiver/note', methods=['POST'])
@require_auth
def add_caregiver_note():
    data = request.get_json()
    db = get_db()
    db.execute(
        'INSERT INTO caregiver_notes (caregiver_user_id, patient_user_id, note) VALUES (?,?,?)',
        (g.current_user['id'], data.get('patient_id'), data.get('note'))
    )
    db.commit()
    return jsonify({'message': 'Note saved'})


@app.route('/api/caregiver/notes/<int:patient_id>', methods=['GET'])
@require_auth
def get_caregiver_notes(patient_id):
    db = get_db()
    rows = db.execute("""
        SELECT cn.*, u.name as caregiver_name
        FROM caregiver_notes cn
        JOIN users u ON u.id = cn.caregiver_user_id
        WHERE cn.patient_user_id=?
        ORDER BY cn.created_at DESC
    """, (patient_id,)).fetchall()
    return jsonify([dict(r) for r in rows])


# ─────────────────────────────────────────────
# WebSocket Events — Real-Time Interactivity
# ─────────────────────────────────────────────
active_sessions = {}  # track live assessment sessions

@socketio.on('connect')
def on_connect():
    print(f"[WS] Client connected: {request.sid}")
    emit('connected', {'message': 'Connected to Intinn real-time engine'})


@socketio.on('disconnect')
def on_disconnect():
    print(f"[WS] Client disconnected: {request.sid}")


@socketio.on('join_user_room')
def join_user_room(data):
    """Client authenticates and joins their private room."""
    token = data.get('token')
    with app.app_context():
        db = sqlite3.connect(app.config['DATABASE'])
        db.row_factory = sqlite3.Row
        user = db.execute('SELECT * FROM users WHERE token=?', (token,)).fetchone()
        db.close()

    if user:
        room = f"user_{user['id']}"
        join_room(room)
        emit('room_joined', {'room': room, 'user': user['name']})
        print(f"[WS] {user['name']} joined room {room}")
    else:
        emit('error', {'message': 'Invalid token'})


@socketio.on('start_live_assessment')
def start_live_assessment(data):
    """Tracks a live assessment in progress."""
    sid = request.sid
    active_sessions[sid] = {
        'domain': data.get('domain'),
        'started_at': time.time(),
        'responses': []
    }
    emit('assessment_started', {
        'domain': data.get('domain'),
        'message': 'Assessment started — good luck!'
    })


@socketio.on('assessment_response')
def assessment_response(data):
    """Client sends each answer; server gives live feedback."""
    sid = request.sid
    if sid not in active_sessions:
        emit('error', {'message': 'No active session'})
        return

    session = active_sessions[sid]
    session['responses'].append(data)

    elapsed = round(time.time() - session['started_at'], 1)
    emit('response_received', {
        'question_id': data.get('question_id'),
        'elapsed_seconds': elapsed,
        'responses_so_far': len(session['responses'])
    })


@socketio.on('end_live_assessment')
def end_live_assessment(data):
    """Client signals completion; server calculates final metrics."""
    sid = request.sid
    session = active_sessions.pop(sid, {})
    total_time = round(time.time() - session.get('started_at', time.time()), 1)

    emit('assessment_ended', {
        'domain': session.get('domain'),
        'total_time_seconds': total_time,
        'response_count': len(session.get('responses', [])),
        'message': 'Assessment complete! Submit your score via the REST API.'
    })


@socketio.on('live_game_event')
def live_game_event(data):
    """Broadcasts live game events (useful for multiplayer or caregiver watching)."""
    room = data.get('room')
    if room:
        emit('game_event', data, room=room, include_self=False)


@socketio.on('caregiver_watch')
def caregiver_watch(data):
    """Caregiver joins patient's room to get live updates."""
    patient_id = data.get('patient_id')
    room = f"user_{patient_id}"
    join_room(room)
    emit('watching', {'message': f"Now watching patient {patient_id}'s live activity"})


def _notify_caregivers(patient_id, event_type, payload):
    """Push real-time event to all caregivers linked to this patient."""
    with app.app_context():
        db = sqlite3.connect(app.config['DATABASE'])
        db.row_factory = sqlite3.Row
        caregivers = db.execute(
            'SELECT caregiver_user_id FROM caregivers WHERE patient_user_id=? AND approved=1',
            (patient_id,)
        ).fetchall()
        db.close()

    for cg in caregivers:
        room = f"user_{cg['caregiver_user_id']}"
        socketio.emit('patient_update', {
            'patient_id': patient_id,
            'event': event_type,
            'data': payload
        }, room=room)


# ─────────────────────────────────────────────
# Utility Routes
# ─────────────────────────────────────────────
@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'app': 'Intinn',
        'version': '1.0.0',
        'timestamp': datetime.now().isoformat()
    })


@app.route('/api/domains/overview', methods=['GET'])
def domains_overview():
    """Public overview of what each domain measures."""
    return jsonify({
        domain: {
            **info,
            'clinical_tools': {
                'memory': ['Free and Cued Selective Reminding Test', 'Word List Learning (MoCA)'],
                'executive': ['Trail Making Test B', 'Clock Drawing Test'],
                'processing_speed': ['Symbol Digit Modalities Test', 'Trail Making Test A'],
                'language': ['Verbal Fluency (FAS)', 'Boston Naming Test']
            }.get(domain, [])
        }
        for domain, info in COGNITIVE_DOMAINS.items()
    })


# ─────────────────────────────────────────────
# Run
# ─────────────────────────────────────────────
if __name__ == '__main__':
    init_db()
    print("\n Intinn Backend Running")
    print("   REST API  → http://localhost:5000/api/")
    print("   WebSocket → ws://localhost:5000/socket.io/\n")
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)