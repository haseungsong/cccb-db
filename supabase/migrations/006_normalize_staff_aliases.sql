update public.staff_members
set name = '스테파니'
where lower(trim(name)) in ('스테', '스테파니', 'ste', 'stephanie', 'stefanie', 'stefani');

update public.staff_members
set name = '김철홍'
where regexp_replace(lower(trim(name)), '[^a-z0-9가-힣]+', '', 'g') in (
  '김철홍',
  '원장님',
  '원장',
  'kimcheolhong',
  'cheolhongkim',
  'kimcheulhong',
  'cheulhongkim',
  'kimchulhong',
  'chulhongkim',
  'hongkimcheol',
  'directorkim',
  'directorkimcheolhong'
);

with stephanie_ids as (
  select id, row_number() over (order by created_at, id) as rn
  from public.staff_members
  where name = '스테파니'
),
stephanie_canonical as (
  select id from stephanie_ids where rn = 1
),
stephanie_duplicates as (
  select id from stephanie_ids where rn > 1
)
update public.contacts
set owner_staff_id = (select id from stephanie_canonical)
where owner_staff_id in (select id from stephanie_duplicates);

delete from public.staff_members
where id in (
  with stephanie_ids as (
    select id, row_number() over (order by created_at, id) as rn
    from public.staff_members
    where name = '스테파니'
  )
  select id from stephanie_ids where rn > 1
);

with kim_ids as (
  select id, row_number() over (order by created_at, id) as rn
  from public.staff_members
  where name = '김철홍'
),
kim_canonical as (
  select id from kim_ids where rn = 1
),
kim_duplicates as (
  select id from kim_ids where rn > 1
)
update public.contacts
set owner_staff_id = (select id from kim_canonical)
where owner_staff_id in (select id from kim_duplicates);

delete from public.staff_members
where id in (
  with kim_ids as (
    select id, row_number() over (order by created_at, id) as rn
    from public.staff_members
    where name = '김철홍'
  )
  select id from kim_ids where rn > 1
);
