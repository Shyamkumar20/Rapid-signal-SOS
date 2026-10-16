# Rapid Signal SOS

**AI-Assisted Accident Reporting and Emergency Response Coordination**

Rapid Signal SOS is a hackathon project that explores how AI, voice interaction, and location-aware reporting can help people report road accidents and coordinate emergency-response information more efficiently.

## Problem Statement

During a road accident, witnesses may struggle to communicate incident details and location quickly. Rapid Signal SOS explores a more accessible reporting workflow using voice interaction and structured incident information.

## Our Solution

The project prototype includes:

- **TARA — Timely Assistance and Response Agent:** Voice-based interaction to help collect accident information.
- **ARJUN:** An incident-processing workflow that analyzes report information, incorporates available location data, and generates a structured incident report.
- **Location Assistance:** Uses browser geolocation, subject to user permission.
- **Incident Management:** Provides interfaces for citizen reports and official/admin workflows.
- **Report Generation:** Generates a downloadable incident document.
- **Database Integration:** Uses Supabase for authentication and data storage.
- **Recognition Workflow:** Includes a rewards interface for recognizing helpful citizens.

## Technology Stack

- Frontend: React, TypeScript
- Build Tool: Vite
- Styling: Tailwind CSS
- Voice AI Integration: ElevenLabs React SDK
- Backend / Database: Supabase
- Icons: Lucide React

## Getting Started

### Prerequisites

- Node.js and npm
- A Supabase project configured for the application
- An ElevenLabs agent, if you want to test the integrated voice-agent functionality

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/YOUR-USERNAME/rapid-signal-sos.git
   cd rapid-signal-sos
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file in the project root and configure the required variables:

   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_publishable_or_anon_key
   VITE_ELEVENLABS_AGENT_ID=your_elevenlabs_agent_id
   ```

   Use only credentials intended for frontend use. Never put service-role keys or other server secrets in `VITE_` variables.

4. Configure the Supabase database using the migration files in the `supabase/migrations/` directory. Deploy the Edge Function separately if you need its demo dispatch workflow.

5. Start the development server:

   ```bash
   npm run dev
   ```

6. Open the local URL printed in the terminal.

## Project Status

This is a hackathon prototype. Features depend on the configured services and permissions. The included dispatch workflow records simulated dispatch requests; it does not independently confirm that emergency services have received or acted on an alert.

## Safety Notice

Rapid Signal SOS is not an officially verified emergency-response system. Do not rely on this prototype for real emergencies or assume that a submitted report automatically contacts police, fire services, or an ambulance.

## Team

- Project contributors: Add all team members and their contributions here.
- Hackathon: Add the official event name and year.

## Future Improvements

- Integrate and verify authorized emergency-notification services.
- Improve incident classification and location accuracy.
- Strengthen authentication, access control, and audit logging.
- Test accessibility, reliability, and multilingual voice interactions.

## License

A license has not yet been selected. Add a license after confirming the team's ownership and permission to publish the project.
