import { Redirect } from 'expo-router';

export default function CollectionsRedirect() {
  return <Redirect href={{ pathname: '/(app)/console/billing', params: { tab: 'collections' } }} />;
}
