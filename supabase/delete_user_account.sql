-- Deletes the calling user's data and auth record.
-- Must be run in the Supabase SQL editor (Dashboard → SQL Editor → Run).
-- SECURITY DEFINER allows the function to delete from auth.users,
-- which is otherwise inaccessible to the anon/authenticated roles.
-- SET search_path = public prevents search-path hijacking attacks.

CREATE OR REPLACE FUNCTION delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.user_data WHERE user_id = auth.uid();
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;
