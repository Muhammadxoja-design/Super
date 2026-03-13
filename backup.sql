--
-- PostgreSQL database dump
--

\restrict ZiptKqqqGBCUgF2xHmdOMXBrrBnV6C7HwwzDeWuXyOqeXNPasBqm6s2Rz79Rd7G

-- Dumped from database version 18.1 (Debian 18.1-1.pgdg12+2)
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id integer NOT NULL,
    actor_id integer,
    action text NOT NULL,
    target_type text NOT NULL,
    target_id integer,
    metadata text,
    payload_hash text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: billing_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.billing_transactions (
    id integer NOT NULL,
    user_id integer,
    amount numeric(12,2) NOT NULL,
    currency text DEFAULT 'UZS'::text,
    method text DEFAULT 'manual'::text,
    note text,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: billing_transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.billing_transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: billing_transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.billing_transactions_id_seq OWNED BY public.billing_transactions.id;


--
-- Name: broadcast_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.broadcast_logs (
    id integer NOT NULL,
    broadcast_id integer NOT NULL,
    user_id integer,
    telegram_id text,
    status text DEFAULT 'pending'::text NOT NULL,
    attempts integer DEFAULT 0,
    last_error_code integer,
    last_error_message text,
    next_attempt_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: broadcast_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.broadcast_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: broadcast_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.broadcast_logs_id_seq OWNED BY public.broadcast_logs.id;


--
-- Name: broadcasts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.broadcasts (
    id integer NOT NULL,
    created_by_admin_id integer NOT NULL,
    message_text text,
    media_url text,
    mode text DEFAULT 'copy'::text NOT NULL,
    source_chat_id text,
    source_message_id integer,
    status text DEFAULT 'draft'::text NOT NULL,
    total_count integer DEFAULT 0,
    sent_count integer DEFAULT 0,
    failed_count integer DEFAULT 0,
    started_at timestamp without time zone,
    finished_at timestamp without time zone,
    correlation_id text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: broadcasts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.broadcasts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: broadcasts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.broadcasts_id_seq OWNED BY public.broadcasts.id;


--
-- Name: message_queue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.message_queue (
    id integer NOT NULL,
    type text NOT NULL,
    user_id integer,
    telegram_id text,
    payload text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    attempts integer DEFAULT 0,
    last_error_code integer,
    last_error_message text,
    next_attempt_at timestamp without time zone,
    delivered_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: message_queue_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.message_queue_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: message_queue_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.message_queue_id_seq OWNED BY public.message_queue.id;


--
-- Name: message_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.message_templates (
    id integer NOT NULL,
    title text,
    body text NOT NULL,
    is_active boolean DEFAULT true,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: message_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.message_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: message_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.message_templates_id_seq OWNED BY public.message_templates.id;


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    id integer NOT NULL,
    user_id integer NOT NULL,
    token_hash text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp without time zone NOT NULL
);


--
-- Name: sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sessions_id_seq OWNED BY public.sessions.id;


--
-- Name: task_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_assignments (
    id integer NOT NULL,
    task_id integer NOT NULL,
    user_id integer NOT NULL,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    status_updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    status_updated_by_user_id integer,
    status_note text,
    note text,
    proof_text text,
    proof_file_id text,
    proof_type text,
    proof_submitted_at timestamp without time zone,
    delivered_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: task_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.task_assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: task_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.task_assignments_id_seq OWNED BY public.task_assignments.id;


--
-- Name: task_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_events (
    id integer NOT NULL,
    task_id integer NOT NULL,
    assignment_id integer NOT NULL,
    user_id integer NOT NULL,
    status text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: task_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.task_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: task_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.task_events_id_seq OWNED BY public.task_events.id;


--
-- Name: tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tasks (
    id integer NOT NULL,
    title text NOT NULL,
    description text,
    idempotency_key text,
    created_by_admin_id integer NOT NULL,
    assigned_to integer,
    status text DEFAULT 'ACTIVE'::text,
    due_date text,
    target_type text,
    target_value text,
    target_count integer DEFAULT 0,
    template_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: tasks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tasks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tasks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tasks_id_seq OWNED BY public.tasks.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    telegram_id text,
    login text,
    username text,
    first_name text,
    last_name text,
    phone text,
    region text,
    district text,
    viloyat text,
    tuman text,
    shahar text,
    mahalla text,
    address text,
    birth_date text,
    direction text,
    photo_url text,
    password_hash text,
    is_admin boolean DEFAULT false,
    role text DEFAULT 'user'::text NOT NULL,
    plan text DEFAULT 'FREE'::text NOT NULL,
    pro_until timestamp without time zone,
    status text DEFAULT 'approved'::text NOT NULL,
    telegram_status text DEFAULT 'active'::text,
    last_seen timestamp without time zone,
    last_active timestamp without time zone,
    approved_at timestamp without time zone,
    approved_by text,
    rejected_at timestamp without time zone,
    rejected_by text,
    rejection_reason text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: billing_transactions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_transactions ALTER COLUMN id SET DEFAULT nextval('public.billing_transactions_id_seq'::regclass);


--
-- Name: broadcast_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.broadcast_logs ALTER COLUMN id SET DEFAULT nextval('public.broadcast_logs_id_seq'::regclass);


--
-- Name: broadcasts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.broadcasts ALTER COLUMN id SET DEFAULT nextval('public.broadcasts_id_seq'::regclass);


--
-- Name: message_queue id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_queue ALTER COLUMN id SET DEFAULT nextval('public.message_queue_id_seq'::regclass);


--
-- Name: message_templates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_templates ALTER COLUMN id SET DEFAULT nextval('public.message_templates_id_seq'::regclass);


--
-- Name: sessions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions ALTER COLUMN id SET DEFAULT nextval('public.sessions_id_seq'::regclass);


--
-- Name: task_assignments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_assignments ALTER COLUMN id SET DEFAULT nextval('public.task_assignments_id_seq'::regclass);


--
-- Name: task_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_events ALTER COLUMN id SET DEFAULT nextval('public.task_events_id_seq'::regclass);


--
-- Name: tasks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks ALTER COLUMN id SET DEFAULT nextval('public.tasks_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.audit_logs (id, actor_id, action, target_type, target_id, metadata, payload_hash, created_at) FROM stdin;
\.


--
-- Data for Name: billing_transactions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.billing_transactions (id, user_id, amount, currency, method, note, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: broadcast_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.broadcast_logs (id, broadcast_id, user_id, telegram_id, status, attempts, last_error_code, last_error_message, next_attempt_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: broadcasts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.broadcasts (id, created_by_admin_id, message_text, media_url, mode, source_chat_id, source_message_id, status, total_count, sent_count, failed_count, started_at, finished_at, correlation_id, created_at) FROM stdin;
\.


--
-- Data for Name: message_queue; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.message_queue (id, type, user_id, telegram_id, payload, status, attempts, last_error_code, last_error_message, next_attempt_at, delivered_at, created_at, updated_at) FROM stdin;
1	admin_notification	2	6275649967	{"type":"admin_notification","text":"🆕 Yangi user (Telegram)\\nID: 5\\nIsm: Dilnozaxon\\nStatus: approved"}	sent	1	\N	\N	\N	2026-02-27 10:16:47.57	2026-02-27 10:16:47.208874	2026-02-27 10:16:47.57
2	admin_notification	3	6813216374	{"type":"admin_notification","text":"🆕 Yangi user (Telegram)\\nID: 5\\nIsm: Dilnozaxon\\nStatus: approved"}	sent	1	\N	\N	\N	2026-02-27 10:16:48.099	2026-02-27 10:16:47.463992	2026-02-27 10:16:48.099
3	admin_notification	4	1804690559	{"type":"admin_notification","text":"🆕 Yangi user (Telegram)\\nID: 5\\nIsm: Dilnozaxon\\nStatus: approved"}	sent	1	\N	\N	\N	2026-02-27 10:16:48.509	2026-02-27 10:16:47.499619	2026-02-27 10:16:48.509
4	admin_notification	4	1804690559	{"type":"admin_notification","text":"🆕 Yangi user (Telegram)\\nID: 6\\nIsm: Diyorbek\\nStatus: approved"}	sent	1	\N	\N	\N	2026-02-27 10:17:45.928	2026-02-27 10:17:45.194585	2026-02-27 10:17:45.928
5	admin_notification	3	6813216374	{"type":"admin_notification","text":"🆕 Yangi user (Telegram)\\nID: 6\\nIsm: Diyorbek\\nStatus: approved"}	sent	1	\N	\N	\N	2026-02-27 10:17:46.197	2026-02-27 10:17:45.198336	2026-02-27 10:17:46.197
6	admin_notification	2	6275649967	{"type":"admin_notification","text":"🆕 Yangi user (Telegram)\\nID: 6\\nIsm: Diyorbek\\nStatus: approved"}	sent	1	\N	\N	\N	2026-02-27 10:17:46.456	2026-02-27 10:17:45.199525	2026-02-27 10:17:46.456
\.


--
-- Data for Name: message_templates; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.message_templates (id, title, body, is_active, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sessions (id, user_id, token_hash, created_at, expires_at) FROM stdin;
1	3	3a7ef15431dbf834da698b1df759e5c9345ead22f9c76b89608d74f2321fa158	2026-02-27 09:55:44.075742	2026-03-06 09:55:44.053
2	2	237d63b183dc046dcb91b385b8fdb0135aa9a805c16437e6f6876be8f50de3b3	2026-02-27 09:58:02.401736	2026-03-06 09:58:02.381
3	5	dda9f6acd044a2196b4e0792715e02db756fd3c20c0b33cd189085d038652dc2	2026-02-27 10:16:47.567234	2026-03-06 10:16:47.55
4	4	3fa87e86da4d09e2d2906bef5b13ca0dbb6f3ebd0cb2dc227e6047fd581ff5e8	2026-02-27 10:17:35.94248	2026-03-06 10:17:35.928
5	6	0dbe771a1555d7baec8849cca7f7d5de4562c65aa3bb2ae5d94509abb22b64e7	2026-02-27 10:17:45.263073	2026-03-06 10:17:45.247
\.


--
-- Data for Name: task_assignments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.task_assignments (id, task_id, user_id, status, status_updated_at, status_updated_by_user_id, status_note, note, proof_text, proof_file_id, proof_type, proof_submitted_at, delivered_at, created_at) FROM stdin;
\.


--
-- Data for Name: task_events; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.task_events (id, task_id, assignment_id, user_id, status, created_at) FROM stdin;
\.


--
-- Data for Name: tasks; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tasks (id, title, description, idempotency_key, created_by_admin_id, assigned_to, status, due_date, target_type, target_value, target_count, template_id, created_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, telegram_id, login, username, first_name, last_name, phone, region, district, viloyat, tuman, shahar, mahalla, address, birth_date, direction, photo_url, password_hash, is_admin, role, plan, pro_until, status, telegram_status, last_seen, last_active, approved_at, approved_by, rejected_at, rejected_by, rejection_reason, created_at, updated_at) FROM stdin;
1	web:fsoicetly	fsoicetly	fsoicetly	Admin	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	scrypt$c4a58346be9bc4ed39b083bcb276ddd4$bb60c01bc86e674d0351830954311575f3a3591e2ff04479ecec24aa97e9e6a22e5c4414c772be58b1dfbd20a8b51738edf8452cfc586b4a87eee0b8a65b30b4	t	limited_admin	FREE	\N	approved	active	\N	\N	\N	\N	\N	\N	\N	2026-02-27 09:53:33.142058	2026-02-27 09:53:33.142058
3	6813216374	\N	m_kimyonazarov	MuhammadXo'ja | Dasturchi	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	https://t.me/i/userpic/320/2T-o4GybjqA87gEZFOMkuJG029GCxZ0covVbcj28LHpYEswWYaufZvP0IbOWWLws.svg	\N	t	super_admin	FREE	\N	approved	active	2026-02-27 10:06:55.017	2026-02-27 10:06:55.017	\N	\N	\N	\N	\N	2026-02-27 09:53:33.326924	2026-02-27 10:06:55.017
2	6275649967	\N	Future_Tr	Future	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	https://t.me/i/userpic/320/CByVqhzNfbBzjSpUQ-pe13MmV7O9qOmpRFAUzTYS_sCjLG8N1wCn4ZLgKWABrNFS.svg	\N	t	super_admin	FREE	\N	approved	active	2026-02-27 10:15:30.809	2026-02-27 10:15:30.809	\N	\N	\N	\N	\N	2026-02-27 09:53:33.265314	2026-02-27 10:15:30.809
4	1804690559	\N	Shoh_anvarovich	Shohzamon	Anvarjonovich	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	https://t.me/i/userpic/320/KFat3-ipKIJM7qdqAapH4fDkuA94TlnIJq8fWtlgjhg.svg	\N	t	super_admin	FREE	\N	approved	active	2026-02-27 10:17:35.898	2026-02-27 10:17:35.898	\N	\N	\N	\N	\N	2026-02-27 09:53:33.385855	2026-02-27 10:17:35.898
6	7871152419	Nasriddinov_5654	Nasriddinov_5654	Diyorbek	\N	+998972094414	Farg'ona viloyati	Farg'ona tumani	Farg'ona viloyati	Farg'ona tumani	\N	Ulugbek MFY		2008-07-03	Bosh sardor	https://t.me/i/userpic/320/6a1DG5yPgvT2wD2L9WZYD3-Tp3rYwQs8ECNd5qE4T8CDbnpOIog5i6ADzpYnG2mc.svg	scrypt$129b6bc666162f284bd1e536ec58075e$6b03787770da769d01a419d3b7a2903158201d10466899cece6546a5c83a4b7a4b498b0bdbb958830b8238245df2c958a4ed8cbd3607db45aabe3fe391394685	f	user	FREE	\N	approved	active	2026-02-27 10:17:45.215	2026-02-27 10:17:45.215	\N	\N	\N	\N	\N	2026-02-27 10:17:45.137361	2026-02-27 10:19:53.318
5	1542734	\N	kattakhanova_d	Dilnozaxon	Kattaxonova	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	https://t.me/i/userpic/320/2YxQyaOE938omxoNwHiZIcY2sOby7QxNU4vJUsGcGMs.svg	\N	f	user	FREE	\N	approved	active	2026-02-27 10:26:53.853	2026-02-27 10:26:53.853	\N	\N	\N	\N	\N	2026-02-27 10:16:47.146668	2026-02-27 10:26:53.853
\.


--
-- Name: audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.audit_logs_id_seq', 1, false);


--
-- Name: billing_transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.billing_transactions_id_seq', 1, false);


--
-- Name: broadcast_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.broadcast_logs_id_seq', 1, false);


--
-- Name: broadcasts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.broadcasts_id_seq', 1, false);


--
-- Name: message_queue_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.message_queue_id_seq', 6, true);


--
-- Name: message_templates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.message_templates_id_seq', 1, false);


--
-- Name: sessions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.sessions_id_seq', 5, true);


--
-- Name: task_assignments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.task_assignments_id_seq', 1, false);


--
-- Name: task_events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.task_events_id_seq', 1, false);


--
-- Name: tasks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.tasks_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 6, true);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: billing_transactions billing_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_transactions
    ADD CONSTRAINT billing_transactions_pkey PRIMARY KEY (id);


--
-- Name: broadcast_logs broadcast_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.broadcast_logs
    ADD CONSTRAINT broadcast_logs_pkey PRIMARY KEY (id);


--
-- Name: broadcasts broadcasts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.broadcasts
    ADD CONSTRAINT broadcasts_pkey PRIMARY KEY (id);


--
-- Name: message_queue message_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_queue
    ADD CONSTRAINT message_queue_pkey PRIMARY KEY (id);


--
-- Name: message_templates message_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_templates
    ADD CONSTRAINT message_templates_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: task_assignments task_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_assignments
    ADD CONSTRAINT task_assignments_pkey PRIMARY KEY (id);


--
-- Name: task_events task_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_events
    ADD CONSTRAINT task_events_pkey PRIMARY KEY (id);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users_login_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_login_unique ON public.users USING btree (login);


--
-- Name: users_telegram_id_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_telegram_id_unique ON public.users USING btree (telegram_id);


--
-- Name: audit_logs audit_logs_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.users(id);


--
-- Name: billing_transactions billing_transactions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_transactions
    ADD CONSTRAINT billing_transactions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: billing_transactions billing_transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_transactions
    ADD CONSTRAINT billing_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: broadcast_logs broadcast_logs_broadcast_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.broadcast_logs
    ADD CONSTRAINT broadcast_logs_broadcast_id_fkey FOREIGN KEY (broadcast_id) REFERENCES public.broadcasts(id);


--
-- Name: broadcast_logs broadcast_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.broadcast_logs
    ADD CONSTRAINT broadcast_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: broadcasts broadcasts_created_by_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.broadcasts
    ADD CONSTRAINT broadcasts_created_by_admin_id_fkey FOREIGN KEY (created_by_admin_id) REFERENCES public.users(id);


--
-- Name: message_queue message_queue_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_queue
    ADD CONSTRAINT message_queue_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: message_templates message_templates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_templates
    ADD CONSTRAINT message_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: task_assignments task_assignments_status_updated_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_assignments
    ADD CONSTRAINT task_assignments_status_updated_by_user_id_fkey FOREIGN KEY (status_updated_by_user_id) REFERENCES public.users(id);


--
-- Name: task_assignments task_assignments_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_assignments
    ADD CONSTRAINT task_assignments_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id);


--
-- Name: task_assignments task_assignments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_assignments
    ADD CONSTRAINT task_assignments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: task_events task_events_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_events
    ADD CONSTRAINT task_events_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.task_assignments(id);


--
-- Name: task_events task_events_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_events
    ADD CONSTRAINT task_events_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id);


--
-- Name: task_events task_events_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_events
    ADD CONSTRAINT task_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: tasks tasks_created_by_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_created_by_admin_id_fkey FOREIGN KEY (created_by_admin_id) REFERENCES public.users(id);


--
-- Name: tasks tasks_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.message_templates(id);


--
-- PostgreSQL database dump complete
--

\unrestrict ZiptKqqqGBCUgF2xHmdOMXBrrBnV6C7HwwzDeWuXyOqeXNPasBqm6s2Rz79Rd7G

