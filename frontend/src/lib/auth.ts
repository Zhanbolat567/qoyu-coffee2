export function setToken(t?: string){ t ? localStorage.setItem('t', t) : localStorage.removeItem('t') }
export function getToken(){ return localStorage.getItem('t') }