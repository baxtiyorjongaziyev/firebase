import { NextResponse } from 'next/server';
import { createClient } from 'next-sanity';

export const revalidate = 300;

const sanityProjectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'h6ymmj0v';
const sanityDataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production';

const sanityClient = createClient({
  projectId: sanityProjectId,
  dataset: sanityDataset,
  apiVersion: '2024-04-14',
  useCdn: false,
  token: process.env.SANITY_API_READ_TOKEN,
});

export async function GET() {
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
