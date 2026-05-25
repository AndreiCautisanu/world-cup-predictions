import { auth } from "@/auth";
import { handleSignOut } from "./actions";

export default async function Profil() {
  const session = await auth();
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Profil</h2>
      <p className="mb-4">Conectat ca: <strong>{session?.user?.name}</strong></p>
      <form action={handleSignOut}>
        <button type="submit" className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded font-medium">
          Ieși din cont
        </button>
      </form>
    </div>
  );
}
