import React, { useState, useEffect } from 'react';
import { SimulationPreset } from '../types';
import './ConfigurationPage.css';

// Sample real 911 transcript for guidance
const sampleRealTranscript = `911 Caller: I'm sorry. You want me to, tell her how to
911 Dispatcher: What time are you setting? Nine one one. What is the address of your emergency?
911 Caller: No.
911 Caller: I'm at Maplewood, and
911 Caller: where am I at, baby? Maplewood and Cherry Street.
911 Dispatcher: What's your name?
911 Caller: Myra Callister. My husband just got jumped, and they took my car keys.
911 Dispatcher: What's the telephone number you're calling from?
911 Dispatcher: Was he inside the vehicle? Was—
911 Caller: And my husband's—I think his jaw's broke,
911 Caller: It's my cell phone number. It's 555-123-7890
911 Caller: No. He got it. The—
911 Caller: walk walk to go take a piss.
911 Caller: And they jumped him.
911 Caller: They pistol whipped him.
911 Dispatcher: Okay.
911 Caller: I'm in the parking lot at National First Bank.
911 Caller: I just—I got my other car. I got two cars. I was smiling
911 Caller: because I was taking my rental car. It's my rental car, actually.
911 Caller: That they got the keys to. And—
911 Dispatcher: Okay. I'm just updating this information. Give me one moment.
911 Caller: I don't know fucking—I'm gonna have to—
911 Caller: want me to take you to the hospital? I'm going to have to.
911 Caller: I'm gonna have to take him to a hospital.
911 Dispatcher: Okay. I'll alert the medic, ma'am. Just stay where you are.
911 Caller: And what were you saying here, baby?
911 Caller: You're gonna have to call a car. I know. I have to.
911 Caller: Well, the parking part or not?
911 Caller: I'm at the—the National First Bank.
911 Dispatcher: And when did this happen? How many minutes ago did this happen?
911 Caller: Just now, like, three minutes ago, two minutes ago. They were in the alley.
911 Caller: Right on—they—what street is that? Elm?
911 Dispatcher: I need to get the suspect's description. Were they Black, White, or Hispanic?
911 Caller: What do they look like, baby? I don't know.
911 Caller: They're Black dudes. I mean, I really didn't see much.
911 Caller: I heard him screaming in the alley.
911 Dispatcher: No. But they were wearing—
911 Caller: They're all Black. Right? Yeah. All Black. And—
911 Dispatcher: They were wearing all black. Is that correct?
911 Dispatcher: What—
911 Caller: Yeah. And it's a pistol. There's a metal pistol. There's two of them.
911 Dispatcher: What color is the vehicle?
911 Caller: My vehicle is a black—it's a black Malibu. It's parked
911 Caller: right behind the tire shop.
911 Dispatcher: No. The one—the—
911 Caller: It's a rental. It's a rental.
911 Dispatcher: The one that they took, ma'am?
911 Caller: My—it's a black rental. It's a Malibu. It's
911 Caller: it's still parked in the—on the street. They're about—I know they're about to take my car.
911 Dispatcher: So they didn't take—
911 Dispatcher: Okay. So they didn't take the vehicle, ma'am?
911 Caller: Not yet. They have the keys to my car.
911 Dispatcher: Okay.
911 Caller: They're waiting. Hey. I need to go to the hospital. They wanna make a report there.
911 Caller: He wants me to take him to the hospital.
911 Caller: It's fucking leaking everywhere.
911 Caller: Is that my car?
911 Dispatcher: I'm just updating this information. Just bear with me, ma'am.
911 Caller: No. Alright. Yeah. I just need to check your mail, and I thought it was ours.
911 Caller: I—I gotta take him to the hospital. I got to.
911 Dispatcher: I already stated that there's a medic already en route, ma'am.
911 Caller: No.
911 Dispatcher: How old is your husband?
911 Caller: He's done. 37. I'm done.
911 Caller: I'm fucking done.
911 Dispatcher: I'm just updating this information. Give me one moment.
911 Caller: I'm blocked by another car. You want me to go back and get it? I can't—I can't get into it.
911 Dispatcher: Is the attacker still nearby?
911 Caller: I can try and get in the car real quick. You want me to—what?
911 Dispatcher: Is the attacker still nearby?
911 Dispatcher: Okay. No problem.
911 Caller: I—I don't know. I—I got out of there. I'm taking him to the hospital. I left.
911 Dispatcher: Ma'am—
911 Dispatcher: So do you need a medic? That's what I'm asking. Because—
911 Dispatcher: Okay, ma'am.
911 Caller: No. No. I don't need a medic. I'm the—I'm
911 Caller: taking him to the hospital myself.
911 Caller: Yes. I have to.
911 Dispatcher: So would you like to report what happened, or you're gonna wait till you get—
911 Dispatcher: or you're gonna wait till you get to your location?
911 Caller: I'm sorry. I'm talking to him, and I'm talking to you.
911 Dispatcher: I understand, but I'm putting it in for a medic. And now you're saying you don't need a—
911 Caller: I'm going to the hospital,
911 Dispatcher: So what is it that you need me to do? Are you gonna wait till you get to the hospital, or you
911 Dispatcher: wanna report it now?
911 Caller: I mean, can I report it now, and then can the
911 Caller: cops come to the hospital and meet me?
911 Dispatcher: Give me one moment, ma'am.
911 Caller: I'm sorry.
911 Dispatcher: It's okay. I just gotta exit out the screen and go to
911 Dispatcher: police because you're already
911 Dispatcher: gone again. Give me one moment.
911 Caller: Baby, I'm trying. Okay?
911 Caller: I—you want me to try around?
911 Caller: You—you need to help me.
911 Dispatcher: I'm just updating this information.
911 Caller: Okay.
911 Dispatcher: Where are the weapons now?
911 Caller: No. What—hit—they had—
911 Caller: their—the weapons are still on the suspects.
911 Dispatcher: Okay.
911 Caller: That's all I could tell you.
911 Caller: And like I said, they are two African Americans, and they have—
911 Caller: they're dressed in all black.
911 Caller: And I was going—
911 Caller: is that Rose and Elm, baby?
911 Caller: Yeah, babe. Rose—
911 Dispatcher: What—what—what hospital are you taking him to?
911 Caller: I'm taking him to Central Medical University right now,
911 Caller: It was Rose and Elm.
911 Caller: Corner of Rose and Elm. I'm sorry. Not Maplewood.
911 Caller: I don't really know my way around here.
911 Dispatcher: Okay. So what is the two cross streets, ma'am?
911 Caller: It's Rose and Elm.
911 Caller: Oh my god. I'm here, baby. I'm trying.
911 Caller: I'm—I'm fucking—I'm trying.
911 Caller: I—I threw everything.
911 Caller: I heard you screaming.
911 Dispatcher: I'm just updating this information, ma'am.
911 Caller: Okay.
911 Caller: No.
911 Caller: Oh, hey. You're calling for Joel's on-site.
911 Dispatcher: I'm just updating everything that you already given me. Okay?
911 Caller: Okay. Yeah. And there's Oakmart and Dollar Value right here.
911 Dispatcher: Are you gonna stop there, or you're gonna keep going?
911 Dispatcher: You just—okay.
911 Caller: I'm going—I'll keep going to Central Medical.
911 Caller: I—I don't know where anything's happening. I'm trying—
911 Dispatcher: And you said his jaw is broken. Is that correct?
911 Dispatcher: Fractured?
911 Caller: Yes. Yes. It's definitely—it's definitely both.
911 Caller: And like I said, they pistol-whipped him twice.
911 Dispatcher: Okay.
911 Caller: I threw all my shoulder full.
911 Caller: And which way am I going? Keep going.
911 Caller: Go to the one after this one.
911 Dispatcher: I need to get the victim's description. Is he Black, White, or Hispanic?
911 Caller: Black—oh, that's all—oh, the victim is White.
911 Dispatcher: How old is he?
911 Caller: He's 36.
911 Caller: Seven. That'd be thirty-seven.
911 Dispatcher: What's his—what's his name?
911 Caller: James Whitman.
911 Dispatcher: Spell his last name.
911 Dispatcher: Okay. Thank you.
911 Caller: J as in Joey, A M E S
911 Dispatcher: And the only thing that was taken was the keys. Is that correct?
911 Caller: Money.
911 Caller: Like, a hundred and—like, $200 on him. Took his phone.
911 Caller: They took—
911 Caller: his wallet and his phone.
911 Dispatcher: Okay.
911 Dispatcher: I went ahead and updated that information. I'm going to let you go now. An officer will be dispatched
911 Dispatcher: as soon as possible. Call us back if you get new information or need further assistance.
911 Caller: Okay.
911 Dispatcher: I went ahead and updated that information. They'll be out. Okay?
911 Dispatcher: Just make sure you
911 Dispatcher: let the doctor know once you get to the location that off—
911 Dispatcher: that you already put a call in for officers. Okay?
911 Caller: Okay.
911 Dispatcher: Alright.
911 Dispatcher: Bye bye.
911 Caller: Thank you.`;

interface ConfigurationPageProps {
  onSavePreset: (preset: SimulationPreset) => void;
  onLoadPreset: (presetId: string) => void;
  existingPresets: SimulationPreset[];
  editingPreset?: SimulationPreset | null;
  onBack: () => void;
}

export const ConfigurationPage: React.FC<ConfigurationPageProps> = ({
  onSavePreset,
  onLoadPreset,
  existingPresets,
  editingPreset,
  onBack
}) => {
  const [presetName, setPresetName] = useState('');
  const [transcript, setTranscript] = useState('');
  const [realTranscript, setRealTranscript] = useState('');
  const [callerInstructions, setCallerInstructions] = useState('');
  const [cooperationLevel, setCooperationLevel] = useState(70);
  const [backgroundNoise, setBackgroundNoise] = useState<'none' | 'traffic' | 'crowd' | 'home' | 'outdoor'>('none');
  const [backgroundNoiseLevel, setBackgroundNoiseLevel] = useState(30);
  const [volumeLevel, setVolumeLevel] = useState(80);
  const [city, setCity] = useState('Columbus');
  const [state, setState] = useState('OH');

  // US States list
  const usStates = [
    { code: 'AL', name: 'Alabama' },
    { code: 'AK', name: 'Alaska' },
    { code: 'AZ', name: 'Arizona' },
    { code: 'AR', name: 'Arkansas' },
    { code: 'CA', name: 'California' },
    { code: 'CO', name: 'Colorado' },
    { code: 'CT', name: 'Connecticut' },
    { code: 'DE', name: 'Delaware' },
    { code: 'FL', name: 'Florida' },
    { code: 'GA', name: 'Georgia' },
    { code: 'HI', name: 'Hawaii' },
    { code: 'ID', name: 'Idaho' },
    { code: 'IL', name: 'Illinois' },
    { code: 'IN', name: 'Indiana' },
    { code: 'IA', name: 'Iowa' },
    { code: 'KS', name: 'Kansas' },
    { code: 'KY', name: 'Kentucky' },
    { code: 'LA', name: 'Louisiana' },
    { code: 'ME', name: 'Maine' },
    { code: 'MD', name: 'Maryland' },
    { code: 'MA', name: 'Massachusetts' },
    { code: 'MI', name: 'Michigan' },
    { code: 'MN', name: 'Minnesota' },
    { code: 'MS', name: 'Mississippi' },
    { code: 'MO', name: 'Missouri' },
    { code: 'MT', name: 'Montana' },
    { code: 'NE', name: 'Nebraska' },
    { code: 'NV', name: 'Nevada' },
    { code: 'NH', name: 'New Hampshire' },
    { code: 'NJ', name: 'New Jersey' },
    { code: 'NM', name: 'New Mexico' },
    { code: 'NY', name: 'New York' },
    { code: 'NC', name: 'North Carolina' },
    { code: 'ND', name: 'North Dakota' },
    { code: 'OH', name: 'Ohio' },
    { code: 'OK', name: 'Oklahoma' },
    { code: 'OR', name: 'Oregon' },
    { code: 'PA', name: 'Pennsylvania' },
    { code: 'RI', name: 'Rhode Island' },
    { code: 'SC', name: 'South Carolina' },
    { code: 'SD', name: 'South Dakota' },
    { code: 'TN', name: 'Tennessee' },
    { code: 'TX', name: 'Texas' },
    { code: 'UT', name: 'Utah' },
    { code: 'VT', name: 'Vermont' },
    { code: 'VA', name: 'Virginia' },
    { code: 'WA', name: 'Washington' },
    { code: 'WV', name: 'West Virginia' },
    { code: 'WI', name: 'Wisconsin' },
    { code: 'WY', name: 'Wyoming' },
    { code: 'DC', name: 'District of Columbia' }
  ];
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);

  // Load editing preset when component mounts or editingPreset changes
  useEffect(() => {
    if (editingPreset) {
      loadPresetForEditing(editingPreset);
    }
  }, [editingPreset]);

  const loadPresetForEditing = (preset: SimulationPreset) => {
    setPresetName(preset.name);
    setTranscript(preset.transcript);
    setRealTranscript(preset.realTranscript || '');
    setCallerInstructions(preset.callerInstructions);
    setCooperationLevel(preset.config.cooperationLevel);
    setBackgroundNoise(preset.config.backgroundNoise);
    setBackgroundNoiseLevel(preset.config.backgroundNoiseLevel);
    setVolumeLevel(preset.config.volumeLevel);
    setCity(preset.config.city);
    setState(preset.config.state);
    setEditingPresetId(preset.id);
  };

  const resetForm = () => {
    setPresetName('');
    setTranscript('');
    setRealTranscript('');
    setCallerInstructions('');
    setCooperationLevel(70);
    setBackgroundNoise('none');
    setBackgroundNoiseLevel(30);
    setVolumeLevel(80);
    setCity('Columbus');
    setState('OH');
    setEditingPresetId(null);
  };

  const handleSave = () => {
    if (!presetName.trim()) {
      alert('Please enter a preset name');
      return;
    }

    if (!transcript.trim()) {
      alert('Please enter a transcript');
      return;
    }

    const preset: SimulationPreset = {
      id: editingPresetId || Date.now().toString(),
      name: presetName.trim(),
      transcript: transcript.trim(),
      realTranscript: realTranscript.trim() || undefined,
      callerInstructions: callerInstructions.trim(),
      config: {
        cooperationLevel,
        backgroundNoise,
        backgroundNoiseLevel,
        volumeLevel,
        city,
        state
      },
      createdAt: editingPresetId ? 
        existingPresets.find(p => p.id === editingPresetId)?.createdAt || new Date() : 
        new Date(),
      updatedAt: new Date()
    };

    onSavePreset(preset);
    resetForm();
  };

  const handleDelete = (presetId: string) => {
    if (window.confirm('Are you sure you want to delete this preset?')) {
      const updatedPresets = existingPresets.filter(p => p.id !== presetId);
      localStorage.setItem('911-sim-presets', JSON.stringify(updatedPresets));
      window.location.reload(); // Simple refresh to update the list
    }
  };

  const exampleTranscripts = [
    {
      title: "Home Invasion",
      content: "There's someone breaking into my house right now! I can hear them downstairs. I'm hiding in my bedroom with my kids. Please send help immediately!"
    },
    {
      title: "Car Accident",
      content: "I just witnessed a terrible car accident on Highway 71 near the Main Street exit. Two cars collided head-on. I can see people trapped inside. There's smoke coming from one of the vehicles."
    },
    {
      title: "Medical Emergency",
      content: "My husband is having chest pains and trouble breathing. He's 58 years old and has a history of heart problems. He's conscious but in severe pain."
    },
    {
      title: "Structure Fire",
      content: "My apartment building is on fire! I'm on the third floor and I can see flames coming from the second floor. The hallways are filling with smoke. There are families with children trapped up here!"
    }
  ];

  const cooperationDescriptions = {
    low: "Panicked, crying, difficult to understand. May hang up or become unresponsive.",
    medium: "Stressed and scared but trying to help. Provides information in fragments.",
    high: "Distressed but focused. Answers questions clearly and follows instructions."
  };

  const getCooperationDescription = () => {
    if (cooperationLevel <= 30) return cooperationDescriptions.low;
    if (cooperationLevel <= 70) return cooperationDescriptions.medium;
    return cooperationDescriptions.high;
  };

  return (
    <div className="configuration-page">
      <div className="config-header">
        <button className="back-button" onClick={onBack}>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 11H7.83L13.42 5.41L12 4L4 12L12 20L13.41 18.59L7.83 13H20V11Z"/>
          </svg>
          Back
        </button>
        <h1>Simulation Configuration</h1>
        <div className="header-actions">
          {editingPresetId && (
            <button className="cancel-edit-button" onClick={resetForm}>
              Cancel Edit
            </button>
          )}
        </div>
      </div>

      <div className="config-content">
        <div className="config-main">
          {/* Basic Information */}
          <div className="config-section">
            <h2>Basic Information</h2>
            <div className="form-group">
              <label htmlFor="presetName">Preset Name *</label>
              <input
                id="presetName"
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="e.g., Home Invasion - Panic Level"
                className="form-input"
              />
            </div>
          </div>

          {/* Emergency Transcript */}
          <div className="config-section">
            <h2>Emergency Scenario</h2>
            <div className="form-group">
              <label htmlFor="transcript">Emergency Transcript *</label>
              <textarea
                id="transcript"
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Describe the emergency situation that the caller is experiencing..."
                className="form-textarea large"
                rows={4}
              />
              <div className="example-transcripts">
                <h4>Example Scenarios:</h4>
                <div className="example-grid">
                  {exampleTranscripts.map((example, index) => (
                    <div key={index} className="example-card">
                      <h5>{example.title}</h5>
                      <p>{example.content}</p>
                      <button
                        className="use-example-button"
                        onClick={() => setTranscript(example.content)}
                      >
                        Use This Example
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="realTranscript">Real 911 Call Transcript (Optional)</label>
              <div className="transcript-controls">
                <button
                  className="sample-transcript-button"
                  onClick={() => setRealTranscript(sampleRealTranscript)}
                  type="button"
                >
                  Use Sample Real Transcript
                </button>
              </div>
              <textarea
                id="realTranscript"
                value={realTranscript}
                onChange={(e) => setRealTranscript(e.target.value)}
                placeholder="Paste a real 911 call transcript here to guide the conversation flow. The AI will use this to make responses more realistic and follow actual emergency call patterns. Any addresses mentioned will be replaced with your CAD-configured addresses..."
                className="form-textarea large"
                rows={6}
              />
              <div className="field-help">
                <p><strong>How this works:</strong> When provided, this real transcript helps the AI caller follow realistic conversation patterns from actual emergency calls. Any specific addresses mentioned in the real transcript will be automatically replaced with the addresses you configure in the CAD system during the simulation.</p>
              </div>
            </div>
          </div>

          {/* Caller Instructions */}
          <div className="config-section">
            <h2>Caller Behavior Instructions</h2>
            <div className="form-group">
              <label htmlFor="callerInstructions">Custom Instructions (Optional)</label>
              <textarea
                id="callerInstructions"
                value={callerInstructions}
                onChange={(e) => setCallerInstructions(e.target.value)}
                placeholder="Additional instructions for how the caller should behave (e.g., 'The caller is elderly and hard of hearing', 'Caller speaks very quickly due to panic', 'Caller has a speech impediment')..."
                className="form-textarea"
                rows={3}
              />
            </div>
          </div>

          {/* Simulation Settings */}
          <div className="config-section">
            <h2>Simulation Settings</h2>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="cooperationLevel">
                  Cooperation Level: {cooperationLevel}%
                </label>
                <input
                  id="cooperationLevel"
                  type="range"
                  min="0"
                  max="100"
                  value={cooperationLevel}
                  onChange={(e) => setCooperationLevel(Number(e.target.value))}
                  className="form-range"
                />
                <div className="cooperation-description">
                  {getCooperationDescription()}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="volumeLevel">
                  Caller Volume: {volumeLevel}%
                </label>
                <input
                  id="volumeLevel"
                  type="range"
                  min="10"
                  max="100"
                  value={volumeLevel}
                  onChange={(e) => setVolumeLevel(Number(e.target.value))}
                  className="form-range"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="backgroundNoise">Background Audio</label>
                <select
                  id="backgroundNoise"
                  value={backgroundNoise}
                  onChange={(e) => setBackgroundNoise(e.target.value as any)}
                  className="form-select"
                >
                  <option value="none">No Background Noise</option>
                  <option value="traffic">Traffic (Car accident, road emergency)</option>
                  <option value="crowd">Crowd (Public incident, gathering)</option>
                  <option value="home">Home (Domestic emergency)</option>
                  <option value="outdoor">Outdoor (Nature, construction site)</option>
                </select>
              </div>

              {backgroundNoise !== 'none' && (
                <div className="form-group">
                  <label htmlFor="backgroundNoiseLevel">
                    Background Volume: {backgroundNoiseLevel}%
                  </label>
                  <input
                    id="backgroundNoiseLevel"
                    type="range"
                    min="0"
                    max="100"
                    value={backgroundNoiseLevel}
                    onChange={(e) => setBackgroundNoiseLevel(Number(e.target.value))}
                    className="form-range"
                  />
                </div>
              )}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="city">City</label>
                <input
                  id="city"
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="state">State</label>
                <select
                  id="state"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="form-select"
                >
                  {usStates.map(usState => (
                    <option key={usState.code} value={usState.code}>
                      {usState.name} ({usState.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="config-actions">
            <button className="save-preset-button" onClick={handleSave}>
              {editingPresetId ? 'Update Preset' : 'Save Preset'}
            </button>
          </div>
        </div>

        {/* Saved Presets Sidebar */}
        <div className="config-sidebar">
          <h3>Saved Presets</h3>
          {existingPresets.length === 0 ? (
            <div className="no-presets">
              <p>No presets saved yet.</p>
              <p>Create your first simulation preset using the form.</p>
            </div>
          ) : (
            <div className="presets-list">
              {existingPresets.map(preset => (
                <div key={preset.id} className="preset-card">
                  <div className="preset-info">
                    <h4>{preset.name}</h4>
                    <div className="preset-details">
                      <span>Cooperation: {preset.config.cooperationLevel}%</span>
                      <span>Background: {preset.config.backgroundNoise}</span>
                    </div>
                    <div className="preset-date">
                      Updated: {new Date(preset.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="preset-actions">
                    <button
                      className="edit-preset-button"
                      onClick={() => loadPresetForEditing(preset)}
                      title="Edit Preset"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M3 17.25V21H6.75L17.81 9.94L14.06 6.19L3 17.25ZM20.71 7.04C21.1 6.65 21.1 6.02 20.71 5.63L18.37 3.29C17.98 2.9 17.35 2.9 16.96 3.29L15.13 5.12L18.88 8.87L20.71 7.04Z"/>
                      </svg>
                    </button>
                    <button
                      className="delete-preset-button"
                      onClick={() => handleDelete(preset.id)}
                      title="Delete Preset"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6 19C6 20.1 6.9 21 8 21H16C17.1 21 18 20.1 18 19V7H6V19ZM19 4H15.5L14.5 3H9.5L8.5 4H5V6H19V4Z"/>
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};