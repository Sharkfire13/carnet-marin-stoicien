import React, { useState, useEffect } from 'react';
import './App.css';
import citations from './data/citations.json';
import questionsFixes from './data/questions_fixes.json';
import questionsVariables from './data/questions_variables.json';
import { db, getCurrentDate } from './utils/database';
import { 
  notifsSupportees, 
  demanderPermission, 
  envoyerNotification,
  programmerRappel,
  sauvRappels,
  chargerRappels
} from './utils/notifications';

function App() {
  const [ecran, setEcran] = useState('accueil');
  const [reponses, setReponses] = useState({
    humeur_matin: null,
    controle: '',
    questionVariablePrepa: '',
    humeur_soir: null,
    calme: 3,
    amelioration: '',
    questionVariableBilan: ''
  });
  const [stats, setStats] = useState({
    totalShifts: 0,
    prepas: 0,
    bilans: 0,
    humeursMatin: { '😊': 0, '😐': 0, '😞': 0, '😤': 0 },
    humeursSoir: { '😊': 0, '😐': 0, '😞': 0, '😤': 0 },
    calmeTotal: 0,
    calmeMoyen: 0
  });
  const [favoris, setFavoris] = useState([]);
  const [citationDuJour, setCitationDuJour] = useState(citations[0]);
  const [notifPermission, setNotifPermission] = useState(false);
  const [rappelPrepa, setRappelPrepa] = useState('08:00');
  const [rappelBilan, setRappelBilan] = useState('20:00');
  const [timers, setTimers] = useState([]);

  useEffect(() => {
    const reglages = chargerRappels();
    setRappelPrepa(reglages.prepa);
    setRappelBilan(reglages.bilan);
    
    const checkPermission = async () => {
      if (notifsSupportees()) {
        setNotifPermission(Notification.permission === 'granted');
      }
    };
    checkPermission();
  }, []);

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * citations.length);
    setCitationDuJour(citations[randomIndex]);
  }, []);

  const chargerFavoris = async () => {
    try {
      const tousFavoris = await db.favoris.toArray();
      setFavoris(tousFavoris);
    } catch (error) {
      console.error('Erreur chargement favoris :', error);
    }
  };

  const toggleFavori = async (citation) => {
    try {
      const existing = await db.favoris.where('citationId').equals(citation.id).first();
      
      if (existing) {
        await db.favoris.delete(existing.id);
      } else {
        await db.favoris.add({
          citationId: citation.id,
          texte: citation.texte,
          auteur: citation.auteur,
          date: getCurrentDate()
        });
      }
      
      await chargerFavoris();
      
    } catch (error) {
      console.error('Erreur toggle favori :', error);
    }
  };

  const estFavori = (citationId) => {
    return favoris.some(f => f.citationId === citationId);
  };

  useEffect(() => {
    chargerFavoris();
  }, []);

  const sauvegarderShift = async (type) => {
    try {
      const data = {
        date: getCurrentDate(),
        type: type,
        ...reponses
      };
      
      await db.shifts.add(data);
      alert(`✅ ${type === 'prepa' ? 'Shift préparé' : 'Bilan'} sauvegardé !`);
      
      setReponses({
        humeur_matin: null,
        controle: '',
        questionVariablePrepa: '',
        humeur_soir: null,
        calme: 3,
        amelioration: '',
        questionVariableBilan: ''
      });
      
    } catch (error) {
      console.error('Erreur de sauvegarde :', error);
      alert('❌ Erreur de sauvegarde');
    }
  };

  const chargerStats = async () => {
    try {
      const tousLesShifts = await db.shifts.toArray();
      
      const statsTemp = {
        totalShifts: tousLesShifts.length,
        prepas: tousLesShifts.filter(s => s.type === 'prepa').length,
        bilans: tousLesShifts.filter(s => s.type === 'bilan').length,
        humeursMatin: { '😊': 0, '😐': 0, '😞': 0, '😤': 0 },
        humeursSoir: { '😊': 0, '😐': 0, '😞': 0, '😤': 0 },
        calmeTotal: 0,
        calmeMoyen: 0
      };

      let totalCalme = 0;
      let countCalme = 0;

      tousLesShifts.forEach(shift => {
        if (shift.humeur_matin && statsTemp.humeursMatin[shift.humeur_matin] !== undefined) {
          statsTemp.humeursMatin[shift.humeur_matin]++;
        }
        
        if (shift.humeur_soir && statsTemp.humeursSoir[shift.humeur_soir] !== undefined) {
          statsTemp.humeursSoir[shift.humeur_soir]++;
        }
        
        if (shift.calme) {
          totalCalme += shift.calme;
          countCalme++;
        }
      });

      statsTemp.calmeTotal = totalCalme;
      statsTemp.calmeMoyen = countCalme > 0 ? (totalCalme / countCalme).toFixed(1) : 0;

      setStats(statsTemp);
    } catch (error) {
      console.error('Erreur chargement stats :', error);
    }
  };

  const sauvegarderRappels = () => {
    sauvRappels(rappelPrepa, rappelBilan);
    
    timers.forEach(timer => clearTimeout(timer));
    
    const newTimers = [];
    
    if (notifPermission) {
      const timerPrepa = programmerRappel(rappelPrepa, 'shift de préparation');
      const timerBilan = programmerRappel(rappelBilan, 'bilan de shift');
      
      if (timerPrepa.timerId) newTimers.push(timerPrepa.timerId);
      if (timerBilan.timerId) newTimers.push(timerBilan.timerId);
      
      setTimers(newTimers);
    }
  };

  const handleDemanderPermission = async () => {
    const granted = await demanderPermission();
    setNotifPermission(granted);
    if (granted) {
      alert('✅ Notifications autorisées !');
    }
  };

  useEffect(() => {
    if (ecran === 'stats') {
      chargerStats();
    }
    if (ecran === 'favoris') {
      chargerFavoris();
    }
  }, [ecran]);

  const afficherEcran = () => {
    switch(ecran) {
      case 'accueil':
        return (
          <div className="fade-in">
            <div className="citation-box">
              <p className="citation-text">
                "{citationDuJour.texte}"
                <br/>— {citationDuJour.auteur}
              </p>
              <button 
                onClick={() => toggleFavori(citationDuJour)}
                className="favori-star"
              >
                {estFavori(citationDuJour.id) ? '⭐' : '☆'}
              </button>
            </div>
            
            <div className="accueil-buttons">
              <button onClick={() => setEcran('prepa')} className="btn-big">
                🌅 PRÉPARATION SHIFT
              </button>
              <button onClick={() => setEcran('bilan')} className="btn-big">
                🌙 BILAN SHIFT
              </button>
            </div>
          </div>
        );

      case 'prepa': {
        const questionVar = questionsVariables.preparation[
          Math.floor(Math.random() * questionsVariables.preparation.length)
        ];

        return (
          <div className="fade-in">
            <h2>🌅 Préparation du shift</h2>
            <p className="small-citation">
              "{citationDuJour.texte}" — {citationDuJour.auteur}
            </p>

            <div className="card">
              <label className="label">{questionsFixes.preparation[0].question}</label>
              <div className="emoji-container">
                {questionsFixes.preparation[0].options.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => setReponses({...reponses, humeur_matin: emoji})}
                    className="emoji-btn"
                    style={{
                      backgroundColor: reponses.humeur_matin === emoji ? '#C9A96B' : '#1E3A5F'
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div className="card">
              <label className="label">{questionsFixes.preparation[1].question}</label>
              <textarea
                value={reponses.controle}
                onChange={(e) => setReponses({...reponses, controle: e.target.value})}
                className="textarea"
                rows="3"
                placeholder="Ce qui dépend de moi..."
              />
            </div>

            <div className="card">
              <label className="label">{questionVar}</label>
              <textarea
                value={reponses.questionVariablePrepa}
                onChange={(e) => setReponses({...reponses, questionVariablePrepa: e.target.value})}
                className="textarea"
                rows="2"
                placeholder="Ta réponse..."
              />
            </div>

            <div className="button-container">
              <button onClick={() => setEcran('accueil')} className="btn-secondary">
                ← Annuler
              </button>
              <button 
                onClick={() => {
                  sauvegarderShift('prepa');
                  setEcran('accueil');
                }} 
                className="btn-primary"
              >
                Valider
              </button>
            </div>
          </div>
        );
      }

      case 'bilan': {
        const questionVar = questionsVariables.bilan[
          Math.floor(Math.random() * questionsVariables.bilan.length)
        ];

        return (
          <div className="fade-in">
            <h2>🌙 Bilan du shift</h2>
            <p className="small-citation">
              "{citationDuJour.texte}" — {citationDuJour.auteur}
            </p>

            <div className="card">
              <label className="label">{questionsFixes.bilan[0].question}</label>
              <div className="emoji-container">
                {questionsFixes.bilan[0].options.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => setReponses({...reponses, humeur_soir: emoji})}
                    className="emoji-btn"
                    style={{
                      backgroundColor: reponses.humeur_soir === emoji ? '#C9A96B' : '#1E3A5F'
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div className="card">
              <label className="label">{questionsFixes.bilan[1].question}</label>
              <div className="note-container">
                {[1,2,3,4,5].map(note => (
                  <button
                    key={note}
                    onClick={() => setReponses({...reponses, calme: note})}
                    className="note-btn"
                    style={{
                      backgroundColor: reponses.calme === note ? '#C9A96B' : '#1E3A5F'
                    }}
                  >
                    {note}
                  </button>
                ))}
              </div>
            </div>

            <div className="card">
              <label className="label">{questionsFixes.bilan[2].question}</label>
              <textarea
                value={reponses.amelioration}
                onChange={(e) => setReponses({...reponses, amelioration: e.target.value})}
                className="textarea"
                rows="3"
                placeholder="Une chose à améliorer..."
              />
            </div>

            <div className="card">
              <label className="label">{questionVar}</label>
              <textarea
                value={reponses.questionVariableBilan}
                onChange={(e) => setReponses({...reponses, questionVariableBilan: e.target.value})}
                className="textarea"
                rows="2"
                placeholder="Ta réponse..."
              />
            </div>

            <div className="button-container">
              <button onClick={() => setEcran('accueil')} className="btn-secondary">
                ← Annuler
              </button>
              <button 
                onClick={() => {
                  sauvegarderShift('bilan');
                  setEcran('accueil');
                }} 
                className="btn-primary"
              >
                Valider
              </button>
            </div>
          </div>
        );
      }

      case 'stats':
        return (
          <div className="fade-in">
            <h2>📊 Statistiques</h2>
            
            <div className="card">
              <h3 className="card-title">📈 Vue d'ensemble</h3>
              <p>📓 Total shifts : {stats.totalShifts}</p>
              <p>🌅 Préparations : {stats.prepas}</p>
              <p>🌙 Bilans : {stats.bilans}</p>
              <p>⭐ Calme moyen : {stats.calmeMoyen}/5</p>
            </div>

            <div className="card">
              <h3 className="card-title">😊 Humeurs du matin</h3>
              <p>😊 Heureux : {stats.humeursMatin['😊']}</p>
              <p>😐 Neutre : {stats.humeursMatin['😐']}</p>
              <p>😞 Triste : {stats.humeursMatin['😞']}</p>
              <p>😤 Énervé : {stats.humeursMatin['😤']}</p>
            </div>

            <div className="card">
              <h3 className="card-title">🌙 Humeurs du soir</h3>
              <p>😊 Heureux : {stats.humeursSoir['😊']}</p>
              <p>😐 Neutre : {stats.humeursSoir['😐']}</p>
              <p>😞 Triste : {stats.humeursSoir['😞']}</p>
              <p>😤 Énervé : {stats.humeursSoir['😤']}</p>
            </div>

            <button onClick={() => setEcran('accueil')} className="btn-secondary full-width">
              ← Retour
            </button>
          </div>
        );

      case 'favoris':
        return (
          <div className="fade-in">
            <h2>⭐ Mes favoris</h2>
            
            {favoris.length === 0 ? (
              <p className="card">Aucun favori pour l'instant. ⭐ une citation depuis l'accueil !</p>
            ) : (
              favoris.map(fav => (
                <div key={fav.id} className="card favori-item">
                  <p className="favori-texte">
                    "{fav.texte}" — {fav.auteur}
                  </p>
                  <button 
                    onClick={() => toggleFavori({ id: fav.citationId })}
                    className="favori-btn-small"
                  >
                    ⭐
                  </button>
                </div>
              ))
            )}

            <button onClick={() => setEcran('accueil')} className="btn-secondary full-width">
              ← Retour
            </button>
          </div>
        );

      case 'reglages':
        return (
          <div className="fade-in">
            <h2>⚙️ Réglages</h2>
            
            <div className="card">
              <h3 className="card-title">🔔 Notifications</h3>
              <p>Statut : {notifPermission ? '✅ Activées' : '❌ Désactivées'}</p>
              {!notifPermission && (
                <button 
                  onClick={handleDemanderPermission}
                  className="btn-primary full-width"
                >
                  Autoriser les notifications
                </button>
              )}
            </div>

            <div className="card">
              <h3 className="card-title">⏰ Rappels</h3>
              
              <label className="label">Préparation shift :</label>
              <input
                type="time"
                value={rappelPrepa}
                onChange={(e) => setRappelPrepa(e.target.value)}
                className="input"
              />
              
              <label className="label">Bilan shift :</label>
              <input
                type="time"
                value={rappelBilan}
                onChange={(e) => setRappelBilan(e.target.value)}
                className="input"
              />
              
              <div className="button-container">
                <button 
                  onClick={() => {
                    sauvegarderRappels();
                    alert('✅ Rappels programmés !');
                  }} 
                  className="btn-primary"
                >
                  Sauvegarder
                </button>
                <button 
                  onClick={() => {
                    if (notifPermission) {
                      alert('🔔 Test OK – Les notifications seront envoyées aux heures programmées.');
                    } else {
                      alert('⚠️ Les notifications ne sont pas autorisées');
                    }
                  }} 
                  className="btn-secondary"
                >
                  Tester
                </button>
              </div>
            </div>

            <button onClick={() => setEcran('accueil')} className="btn-secondary full-width">
              ← Retour
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="app-container">
      <h1>⚓ Carnet du Marin Stoïcien</h1>
      
      <div className="main-content">
        {afficherEcran()}
      </div>

      <div className="navbar">
        <button 
          className={`nav-item ${ecran === 'accueil' ? 'active' : ''}`}
          onClick={() => setEcran('accueil')}
        >
          ⚓
        </button>
        <button 
          className={`nav-item ${ecran === 'prepa' || ecran === 'bilan' ? 'active' : ''}`}
          onClick={() => setEcran('prepa')}
        >
          📓
        </button>
        <button 
          className={`nav-item ${ecran === 'stats' ? 'active' : ''}`}
          onClick={() => setEcran('stats')}
        >
          📊
        </button>
        <button 
          className={`nav-item ${ecran === 'favoris' ? 'active' : ''}`}
          onClick={() => setEcran('favoris')}
        >
          ⭐
        </button>
        <button 
          className={`nav-item ${ecran === 'reglages' ? 'active' : ''}`}
          onClick={() => setEcran('reglages')}
        >
          ⚙️
        </button>
      </div>
    </div>
  );
}

export default App;// petit changement pour forcer GitHub
