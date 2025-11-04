import { Metadata } from 'next';
import { getSupabase } from '@/lib/supabase';
import Codespace from './codespace';

// Generate metadata for SSR
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const supabase = getSupabase();

  if (!supabase) {
    return {
      title: 'Colab Code - Share Project Codes Instantly',
      description: 'Create, edit, and share code snippets without login. Perfect for collaboration and code reviews.',
    };
  }

  try {
    const { data: codespace, error } = await supabase
      .from('codespaces')
      .select('name, slug, visitor_count')
      .ilike('slug', params.slug)
      .maybeSingle();

    if (error || !codespace) {
      return {
        title: 'Colab Code - Share Project Codes Instantly',
        description: 'Create, edit, and share code snippets without login. Perfect for collaboration and code reviews.',
      };
    }

    const title = codespace.name && codespace.name !== 'Untitled Codespace'
      ? `${codespace.name} - Colab Code`
      : 'Colab Code - Share Project Codes Instantly';

    const description = `View and collaborate on ${codespace.name || 'this codespace'} with ${codespace.visitor_count || 0} views. Share code snippets instantly without login.`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: `https://colabcode.vercel.app/${codespace.slug}`,
        siteName: 'Colab Code',
        type: 'website',
      },
      twitter: {
        card: 'summary',
        title,
        description,
      },
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Colab Code - Share Project Codes Instantly',
      description: 'Create, edit, and share code snippets without login. Perfect for collaboration and code reviews.',
    };
  }
}

export default function Page() {
  return <Codespace />;
}