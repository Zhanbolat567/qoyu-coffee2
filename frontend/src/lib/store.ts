import { create } from 'zustand'
import type { Role } from './types'

export interface User { id:number; name:string; phone:string; role:Role }
interface AuthState {
  user: User | null
  setUser: (u: User | null) => void
}
export const useAuth = create<AuthState>((set)=>({
  user: null, setUser: (u)=>set({user:u})
}))
