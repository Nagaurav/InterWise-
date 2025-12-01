import dynamic from 'next/dynamic';

interface DynamicImportProps {
  componentPath: string;
  loadingComponent?: React.ReactNode;
  ssr?: boolean;
}

export function createDynamicImport({ 
  componentPath, 
  loadingComponent = <div className="flex items-center justify-center p-10"><div className="three-body"><div></div><div></div><div></div></div></div>, 
  ssr = false 
}: DynamicImportProps) {
  return dynamic(
    () => import(componentPath),
    { 
      loading: () => loadingComponent,
      ssr 
    }
  );
}
