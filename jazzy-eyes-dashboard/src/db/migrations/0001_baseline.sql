CREATE TYPE public."TransactionType" AS ENUM (
    'ORDER',
    'SALE',
    'WRITE_OFF',
    'RESTOCK',
    'REVERT_WRITE_OFF'
);

CREATE TABLE public.brands (
    id integer NOT NULL,
    company_name character varying(255) NOT NULL,
    company_id integer NOT NULL,
    brand_name character varying(255) NOT NULL,
    allocation_quantity integer NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    cost_discount_percent numeric(5,2) DEFAULT 0,
    cost_discount_start_date date
);

CREATE TABLE public.frame_statuses (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    "colorScheme" character varying(20) NOT NULL,
    is_protected boolean DEFAULT false NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);

CREATE SEQUENCE public.frame_statuses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.frame_statuses_id_seq OWNED BY public.frame_statuses.id;

CREATE TABLE public.inventory_transactions (
    id integer NOT NULL,
    product_id character varying(255) NOT NULL,
    transaction_type public."TransactionType" NOT NULL,
    transaction_date date NOT NULL,
    quantity integer NOT NULL,
    unit_cost numeric(10,2) NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    status character varying(50) DEFAULT 'completed'::character varying NOT NULL,
    notes text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    invoice_date date,
    invoice_number character varying(100),
    remaining_qty integer,
    reverted_from_id integer,
    write_off_reason character varying(100),
    is_special_order boolean DEFAULT false NOT NULL
);

CREATE SEQUENCE public.inventory_transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.inventory_transactions_id_seq OWNED BY public.inventory_transactions.id;

CREATE TABLE public.products (
    composite_id character varying(255) NOT NULL,
    brand_id integer NOT NULL,
    style_number character varying(100) NOT NULL,
    color_code character varying(50) NOT NULL,
    eye_size character varying(20) NOT NULL,
    gender character varying(20) NOT NULL,
    frame_type character varying(50) NOT NULL,
    product_type character varying(20) NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    status_id integer,
    current_qty integer DEFAULT 1 NOT NULL
);

CREATE TABLE public.rx_sales (
    id integer NOT NULL,
    brand_id integer NOT NULL,
    style_number character varying(100) NOT NULL,
    color_code character varying(50) NOT NULL,
    eye_size character varying(20) NOT NULL,
    gender character varying(20) NOT NULL,
    frame_type character varying(50) NOT NULL,
    product_type character varying(20) NOT NULL,
    sale_date date NOT NULL,
    sale_price numeric(10,2) NOT NULL,
    cost_price numeric(10,2) DEFAULT 0 NOT NULL,
    notes text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);

CREATE SEQUENCE public.rx_sales_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.rx_sales_id_seq OWNED BY public.rx_sales.id;

ALTER TABLE ONLY public.frame_statuses ALTER COLUMN id SET DEFAULT nextval('public.frame_statuses_id_seq'::regclass);

ALTER TABLE ONLY public.inventory_transactions ALTER COLUMN id SET DEFAULT nextval('public.inventory_transactions_id_seq'::regclass);

ALTER TABLE ONLY public.rx_sales ALTER COLUMN id SET DEFAULT nextval('public.rx_sales_id_seq'::regclass);

ALTER TABLE ONLY public.brands
    ADD CONSTRAINT brands_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.frame_statuses
    ADD CONSTRAINT frame_statuses_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.inventory_transactions
    ADD CONSTRAINT inventory_transactions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (composite_id);

ALTER TABLE ONLY public.rx_sales
    ADD CONSTRAINT rx_sales_pkey PRIMARY KEY (id);

CREATE UNIQUE INDEX brands_brand_name_key ON public.brands USING btree (brand_name);

CREATE INDEX brands_company_id_idx ON public.brands USING btree (company_id);

CREATE INDEX brands_company_name_idx ON public.brands USING btree (company_name);

CREATE INDEX frame_statuses_display_order_idx ON public.frame_statuses USING btree (display_order);

CREATE UNIQUE INDEX frame_statuses_name_key ON public.frame_statuses USING btree (name);

CREATE INDEX inventory_transactions_invoice_date_idx ON public.inventory_transactions USING btree (invoice_date);

CREATE INDEX inventory_transactions_product_id_idx ON public.inventory_transactions USING btree (product_id);

CREATE INDEX inventory_transactions_transaction_date_idx ON public.inventory_transactions USING btree (transaction_date);

CREATE INDEX inventory_transactions_transaction_type_idx ON public.inventory_transactions USING btree (transaction_type);

CREATE INDEX products_brand_id_idx ON public.products USING btree (brand_id);

CREATE INDEX products_status_id_idx ON public.products USING btree (status_id);

CREATE INDEX products_style_number_idx ON public.products USING btree (style_number);

CREATE INDEX rx_sales_brand_id_idx ON public.rx_sales USING btree (brand_id);

CREATE INDEX rx_sales_sale_date_idx ON public.rx_sales USING btree (sale_date);

ALTER TABLE ONLY public.inventory_transactions
    ADD CONSTRAINT inventory_transactions_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(composite_id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.brands(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_status_id_fkey FOREIGN KEY (status_id) REFERENCES public.frame_statuses(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public.rx_sales
    ADD CONSTRAINT rx_sales_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.brands(id) ON UPDATE CASCADE ON DELETE RESTRICT;
