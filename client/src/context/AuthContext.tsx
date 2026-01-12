// import {
//   createContext,
//   useContext,
//   useState,
//   ReactNode,
// } from "react";

// interface User {
//   username: string;
// }

// interface AuthContextType {
//   user: User | null;
//   login: (username: string) => void;
//   logout: () => void;
// }

// const AuthContext = createContext<AuthContextType | undefined>(
//   undefined
// );

// export function AuthProvider({ children }: { children: ReactNode }) {
//   const [user, setUser] = useState<User | null>(null);

//   const login = (username: string) => {
//     setUser({ username });
//   };

//   const logout = () => setUser(null);

//   return (
//     <AuthContext.Provider value={{ user, login, logout }}>
//       {children}
//     </AuthContext.Provider>
//   );
// }

// export function useAuth(): AuthContextType {
//   const ctx = useContext(AuthContext);
//   if (!ctx) {
//     throw new Error("useAuth must be used inside AuthProvider");
//   }
//   return ctx;
// }
