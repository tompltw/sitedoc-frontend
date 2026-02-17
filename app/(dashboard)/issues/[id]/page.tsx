import IssueDetailLoader from './IssueDetailLoader';

interface PageProps {
  params: { id: string };
}

export default function IssueDetailPage({ params }: PageProps) {
  // IssueDetailLoader is a Client Component that fetches the issue
  // using the auth token from localStorage, then renders IssueDetail.
  return <IssueDetailLoader issueId={params.id} />;
}
