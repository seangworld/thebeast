export type LocalWorkspaceNavigationItem = {
  label: string;
  href: string;
};

export function isLocalWorkspaceNavigationActive(
  item: LocalWorkspaceNavigationItem,
  pathname: string
) {
  const [itemPath] = item.href.split("#");
  return pathname === itemPath;
}
