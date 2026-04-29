import { useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  authors as staticAuthors,
  authorSlugFromName,
  type Author,
} from "@/data/authors";

const AUTHORS_QUERY_KEY = ["authors"] as const;

interface AuthorsApiResponse {
  authors: Array<{
    id: number;
    slug: string;
    name: string;
    role: string;
    photo: string;
    shortBio: string;
    fullBio: string[];
    expertise: string[];
    credentials: string[];
    yearsExperience: number;
    location: string;
    social: {
      linkedin?: string;
      twitter?: string;
      website?: string;
      email?: string;
    };
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
  }>;
}

async function fetchAuthors(): Promise<Author[]> {
  const res = await fetch("/api/authors");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as AuthorsApiResponse;
  return json.authors.map((a) => ({
    slug: a.slug,
    name: a.name,
    role: a.role,
    photo: a.photo,
    shortBio: a.shortBio,
    fullBio: a.fullBio,
    expertise: a.expertise,
    credentials: a.credentials,
    yearsExperience: a.yearsExperience,
    location: a.location,
    social: a.social,
  }));
}

/**
 * Returns the live author roster from the database, falling back to the
 * bundled static dataset while the network call is in flight (or if it
 * fails). Pages can render synchronously without a loading state.
 */
export function useAuthors(): Author[] {
  const query: UseQueryResult<Author[]> = useQuery({
    queryKey: AUTHORS_QUERY_KEY,
    queryFn: fetchAuthors,
    initialData: staticAuthors,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  return query.data ?? staticAuthors;
}

export function useAuthorBySlug(slug: string | undefined | null): Author | undefined {
  const list = useAuthors();
  return useMemo(() => list.find((a) => a.slug === slug), [list, slug]);
}

export function useAuthorByName(name: string | undefined | null): Author | undefined {
  const list = useAuthors();
  return useMemo(() => {
    if (!name) return undefined;
    const slug = authorSlugFromName(name);
    return list.find((a) => a.slug === slug);
  }, [list, name]);
}

export function useInvalidateAuthors() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: AUTHORS_QUERY_KEY });
}
