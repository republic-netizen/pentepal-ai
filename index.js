import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      router.replace(data.session ? '/chat' : '/login');
    });

    return () => {
      active = false;
    };
  }, [router]);

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--mist)',
        fontSize: 14,
      }}
    >
      Loading PentePal...
    </div>
  );
}
