import { redirect } from 'next/navigation';

/** The organization list lives on the admin page; this path only exists in the breadcrumbs. */
export default function OrganizationsPage(): never {
  redirect('/admin');
}
