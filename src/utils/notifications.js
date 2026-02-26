// Vérifier si les notifications sont supportées
export const notifsSupportees = () => {
  return 'Notification' in window && 'serviceWorker' in navigator;
};

// Demander la permission
export const demanderPermission = async () => {
  if (!notifsSupportees()) {
    console.log('Notifications non supportées');
    return false;
  }
  
  const permission = await Notification.requestPermission();
  return permission === 'granted';
};

// Envoyer une notification
export const envoyerNotification = (titre, options = {}) => {
  if (Notification.permission === 'granted') {
    new Notification(titre, {
      icon: '/vite.svg',
      badge: '/vite.svg',
      ...options
    });
  }
};

// Programmer un rappel
export const programmerRappel = (heure, type) => {
  const maintenant = new Date();
  const [heures, minutes] = heure.split(':');
  const rappel = new Date();
  rappel.setHours(parseInt(heures), parseInt(minutes), 0);
  rappel.setSeconds(0);
  
  let delai = rappel - maintenant;
  if (delai < 0) {
    rappel.setDate(rappel.getDate() + 1);
    delai = rappel - maintenant;
  }
  
  const timerId = setTimeout(() => {
    envoyerNotification(`⏰ Rappel ${type}`, {
      body: `C'est l'heure de ton ${type} !`,
      vibrate: [200, 100, 200]
    });
  }, delai);
  
  return { rappel, timerId };
};

// Sauvegarder les réglages
export const sauvRappels = (prepa, bilan) => {
  localStorage.setItem('rappelPrepa', prepa);
  localStorage.setItem('rappelBilan', bilan);
};

// Charger les réglages
export const chargerRappels = () => {
  return {
    prepa: localStorage.getItem('rappelPrepa') || '08:00',
    bilan: localStorage.getItem('rappelBilan') || '20:00'
  };
};