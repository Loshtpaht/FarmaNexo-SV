-- ERP snapshots are immutable source reports, independent of append-only manual checks.
create table public.farmanexo_erp_imports (
 id uuid primary key default gen_random_uuid(), source_hash text not null unique,
 source_url text not null, sheet_name text not null, report_date date not null,
 date_basis text not null, imported_at timestamptz not null default now(),
 status text not null default 'staging' check(status in ('staging','published','archived')),
 row_count integer not null, center_count integer not null, article_count integer not null,
 positive_count integer not null, zero_count integer not null, negative_count integer not null,
 linked_center_count integer not null, quantity_sum numeric not null
);
create unique index farmanexo_erp_one_published on public.farmanexo_erp_imports(status) where status='published';
create table public.farmanexo_erp_centers (
 import_id uuid not null references public.farmanexo_erp_imports(id), center_key text not null,
 chain_code text not null, chain_name text not null, erp_code text not null,
 name text not null, raw_name text not null, branch_id text references public.farmanexo_branches(id),
 match_method text not null check(match_method in ('exact','unique_prefix','ambiguous','unmatched')),
 candidates text[] not null, row_count integer not null, positive_count integer not null,
 zero_count integer not null, negative_count integer not null, search_text text not null,
 primary key(import_id,center_key), check((branch_id is not null)=(match_method in ('exact','unique_prefix')))
);
create unique index farmanexo_erp_center_branch on public.farmanexo_erp_centers(import_id,branch_id) where branch_id is not null;
create index farmanexo_erp_centers_branch_fk on public.farmanexo_erp_centers(branch_id);
create table public.farmanexo_erp_articles (
 import_id uuid not null references public.farmanexo_erp_imports(id), article_code text not null,
 description text not null, packaging text not null, medication_ids text[] not null,
 search_text text not null, primary key(import_id,article_code)
);
create index farmanexo_erp_article_medications on public.farmanexo_erp_articles using gin(medication_ids);
create table public.farmanexo_erp_stock (
 import_id uuid not null references public.farmanexo_erp_imports(id), source_row integer not null,
 center_key text not null, article_code text not null, quantity numeric not null,
 primary key(import_id,source_row), unique(import_id,center_key,article_code),
 foreign key(import_id,center_key) references public.farmanexo_erp_centers(import_id,center_key),
 foreign key(import_id,article_code) references public.farmanexo_erp_articles(import_id,article_code)
);
create index farmanexo_erp_stock_article on public.farmanexo_erp_stock(import_id,article_code,center_key);
alter table public.farmanexo_erp_imports enable row level security;
alter table public.farmanexo_erp_centers enable row level security;
alter table public.farmanexo_erp_articles enable row level security;
alter table public.farmanexo_erp_stock enable row level security;
revoke all on public.farmanexo_erp_imports,public.farmanexo_erp_centers,public.farmanexo_erp_articles,public.farmanexo_erp_stock from anon,authenticated;
grant select on public.farmanexo_erp_imports,public.farmanexo_erp_centers,public.farmanexo_erp_articles,public.farmanexo_erp_stock to anon,authenticated;
create policy erp_published_import on public.farmanexo_erp_imports for select to anon,authenticated using(status='published');
create policy erp_published_centers on public.farmanexo_erp_centers for select to anon,authenticated using(import_id in(select id from public.farmanexo_erp_imports where status='published'));
create policy erp_published_articles on public.farmanexo_erp_articles for select to anon,authenticated using(import_id in(select id from public.farmanexo_erp_imports where status='published'));
create policy erp_published_stock on public.farmanexo_erp_stock for select to anon,authenticated using(import_id in(select id from public.farmanexo_erp_imports where status='published'));

create function public.farmanexo_erp_catalog() returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('import',to_jsonb(i),
 'centers',(select coalesce(jsonb_agg(to_jsonb(c)-'search_text' order by c.chain_code,c.name,c.erp_code),'[]'::jsonb) from public.farmanexo_erp_centers c where c.import_id=i.id),
 'articles',(select coalesce(jsonb_agg(to_jsonb(a)-'search_text' order by a.description),'[]'::jsonb) from public.farmanexo_erp_articles a where a.import_id=i.id))
 from public.farmanexo_erp_imports i where i.status='published'
$$;

create function public.farmanexo_erp_search(p_query text default '',p_chain text default '',p_center text default '',p_article text default '',p_balance text default '',p_mapping text default '',p_offset integer default 0,p_limit integer default 25)
 returns jsonb language sql stable security invoker set search_path='' as $$
 with selected as (select id from public.farmanexo_erp_imports where status='published'),
 filtered as materialized (
 select s.source_row,s.center_key,s.article_code,s.quantity,c.chain_code,c.chain_name,c.erp_code,c.name as center_name,c.branch_id,c.match_method,a.description,a.packaging,a.medication_ids
 from public.farmanexo_erp_stock s
 join selected i on i.id=s.import_id
 join public.farmanexo_erp_centers c on c.import_id=s.import_id and c.center_key=s.center_key
 join public.farmanexo_erp_articles a on a.import_id=s.import_id and a.article_code=s.article_code
 where (p_chain='' or c.chain_code=p_chain) and (p_center='' or c.center_key=p_center) and (p_article='' or a.article_code=p_article)
 and (p_query='' or strpos(c.search_text||' '||a.search_text,lower(left(p_query,160)))>0)
 and (p_mapping='' or (p_mapping='linked' and c.branch_id is not null) or (p_mapping='pending' and c.branch_id is null))
 and (p_balance='' or (p_balance='positive' and s.quantity>0) or (p_balance='low' and s.quantity between 1 and 5) or (p_balance='zero' and s.quantity=0) or (p_balance='negative' and s.quantity<0))
 ), paged as(select * from filtered order by chain_code,center_name,center_key,description,article_code offset greatest(0,least(p_offset,1000000)) limit greatest(1,least(p_limit,100)))
 select jsonb_build_object('total',(select count(*) from filtered),'rows',(select coalesce(jsonb_agg(to_jsonb(p)),'[]'::jsonb) from paged p),'import_id',(select id from selected))
$$;

create function public.farmanexo_erp_medication(p_medication text) returns jsonb language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('branch_id',c.branch_id,'center_key',s.center_key,'article_code',s.article_code,'quantity',s.quantity,'description',a.description,'packaging',a.packaging,'report_date',i.report_date)),'[]'::jsonb)
 from public.farmanexo_erp_imports i
 join public.farmanexo_erp_articles a on a.import_id=i.id and a.medication_ids @> array[p_medication]
 join public.farmanexo_erp_stock s on s.import_id=a.import_id and s.article_code=a.article_code
 join public.farmanexo_erp_centers c on c.import_id=s.import_id and c.center_key=s.center_key and c.branch_id is not null
 where i.status='published'
$$;
revoke all on function public.farmanexo_erp_catalog(),public.farmanexo_erp_search(text,text,text,text,text,text,integer,integer),public.farmanexo_erp_medication(text) from public;
grant execute on function public.farmanexo_erp_catalog(),public.farmanexo_erp_search(text,text,text,text,text,text,integer,integer),public.farmanexo_erp_medication(text) to anon,authenticated;
alter publication supabase_realtime add table public.farmanexo_erp_imports;
