-- ============================================================================
-- Migration 0009 — function hardening (Supabase database-linter findings)
-- Run AFTER 0008_delivery_and_inbound.sql. Idempotent.
--
--  * Pin search_path on the trigger functions so a role-level search_path
--    cannot shadow the tables they write to.
--  * Revoke EXECUTE on trigger-only functions: they are reachable at
--    /rest/v1/rpc/<name> otherwise, which is never intended.
-- ============================================================================

alter function public.set_updated_at() set search_path = public;
alter function public.touch_conversation_on_message() set search_path = public;
alter function public.touch_interpreter_session() set search_path = public;
alter function public.cancel_jobs_on_appointment_change() set search_path = public;

-- Trigger functions are called by the trigger machinery, never by a client.
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.touch_conversation_on_message() from public, anon, authenticated;
revoke all on function public.touch_interpreter_session() from public, anon, authenticated;
revoke all on function public.cancel_jobs_on_appointment_change() from public, anon, authenticated;
revoke all on function public.sync_salon_plan() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;

-- Onboarding / invite RPCs are for signed-in users only. Each already derives
-- its subject from auth.uid() and raises for anon, but anon should not reach them.
--
-- is_salon_member() and has_salon_role() are deliberately left executable by
-- anon: they appear inside RLS policies on publicly readable tables
-- (salon_gallery, quick_phrases), and revoking EXECUTE turns an anon SELECT
-- into a permission error instead of an empty result.
revoke all on function public.create_salon(text, text, text, text, text, text) from public, anon;
grant execute on function public.create_salon(text, text, text, text, text, text) to authenticated;
revoke all on function public.get_salon_invite(text) from public, anon;
grant execute on function public.get_salon_invite(text) to authenticated;
revoke all on function public.accept_salon_invite(text) from public, anon;
grant execute on function public.accept_salon_invite(text) to authenticated;
revoke all on function public.ensure_automation_rules(uuid) from public, anon;
grant execute on function public.ensure_automation_rules(uuid) to authenticated;
revoke all on function public.salon_monthly_usage(uuid) from public, anon;
grant execute on function public.salon_monthly_usage(uuid) to authenticated, service_role;
