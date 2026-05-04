import { NextResponse } from 'next/server';
import { createClient } from 'next-sanity';

export const revalidate = 300;

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-04-14',
  useCdn: false,
  token: process.env.SANITY_API_READ_TOKEN,
});

export async function GET() {
  if (!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID) {
    return NextResponse.json({ error: 'Sanity project is not configured' }, { status: 500 });
  }

  try {
    const comparisons = await sanityClient.fetch(
      `*[_type == "comparison"] | order(order asc) {
        _id,
        brand,
        oldImg,
        newImg,
        oldHint,
        newHint,
        order
      }`,
    );

    return NextResponse.json({ comparisons });
  } catch (error) {
    console.error('Failed to fetch Sanity comparisons', error);
    return NextResponse.json({ error: 'Failed to fetch comparisons' }, { status: 502 });
  }
}
