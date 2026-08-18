import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import { auth, db } from './firebase-config.js';
import { usernameToEmail } from './utils.js';

export async function loginWithUsername(username, password){
  return signInWithEmailAndPassword(auth, usernameToEmail(username), password);
}
export function logout(){ return signOut(auth); }
export async function getProfile(uid){
  const snap = await getDoc(doc(db,'users',uid));
  return snap.exists() ? { id:snap.id, ...snap.data() } : null;
}
export function watchAuth(callback){
  return onAuthStateChanged(auth, async user => {
    if(!user) return callback(null,null);
    const profile = await getProfile(user.uid);
    callback(user, profile);
  });
}
