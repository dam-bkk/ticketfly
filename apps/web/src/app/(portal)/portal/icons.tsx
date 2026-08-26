import { AlertCircle, Box, KeyRound, Laptop, MessageCircle, Package, ShieldAlert, Smartphone, UserMinus, UserPlus, Wifi } from "lucide-react";

export function ServiceIcon({ name, className }: { name: string; className?: string }) {
  const map: Record<string, React.ReactNode> = {
    "alert-circle": <AlertCircle className={className} />,
    "key-round": <KeyRound className={className} />,
    "user-plus": <UserPlus className={className} />,
    "user-minus": <UserMinus className={className} />,
    laptop: <Laptop className={className} />,
    package: <Package className={className} />,
    smartphone: <Smartphone className={className} />,
    "shield-alert": <ShieldAlert className={className} />,
    wifi: <Wifi className={className} />,
    "message-circle": <MessageCircle className={className} />,
  };
  return <>{map[name] ?? <Box className={className} />}</>;
}
