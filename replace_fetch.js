const fs = require('fs');
const file = 'src/routes/trains.ts';
let code = fs.readFileSync(file, 'utf8');

const regex = /const fetchRemote = async \([\s\S]*?return \[\];\s*\};/g;

const replacement = `const fetchRemote = async (src: string, dst: string, isFallback = false) => {
            const maxRetries = 3;

            for (let i = 0; i < maxRetries; i++) {
                try {
                    console.log(\`[SearchEngine] Trying RapidAPI IRCTC v3...\`);
                    const apiDate = \`\${dateParts[2]}-\${dateParts[1]}-\${dateParts[0]}\`; // YYYY-MM-DD
                    const response = await axios.get(\`\${NEW_API_BASE_URL}/trainBetweenStations?fromStationCode=\${src}&toStationCode=\${dst}&dateOfJourney=\${apiDate}\`, {
                        headers: { 
                            'X-RapidAPI-Host': 'irctc1.p.rapidapi.com',
                            'X-RapidAPI-Key': NEW_API_KEY
                        },
                        timeout: 10000
                    });
                    
                    const externalTrains = response.data?.data || [];
                    console.log(\`[SearchEngine] RapidAPI \${isFallback ? 'Proximity' : 'Direct'} HIT for \${src}->\${dst} (\${externalTrains.length} trains)\`);
                    
                    return externalTrains.map((t: any) => {
                        const fromSplit = t.from_std.split(':');
                        const toSplit = t.to_sta.split(':');
                        const srcMins = parseInt(fromSplit[0]) * 60 + parseInt(fromSplit[1]) + (t.from_day * 1440);
                        const dstMins = parseInt(toSplit[0]) * 60 + parseInt(toSplit[1]) + (t.to_day * 1440);

                        return {
                            train_name: t.train_name,
                            train_no: t.train_number,
                            from_stn_name: t.from,
                            to_stn_name: t.to,
                            from_time: t.from_std,
                            to_time: t.to_sta,
                            travel_time: t.duration,
                            from_std_mins: srcMins,
                            to_sta_mins: dstMins,
                            running_days: {
                                days: t.run_days || [],
                                allDays: (t.run_days || []).length === 7
                            },
                            fromStationSchedule: { day: t.from_day + 1 },
                            toStationSchedule: { day: t.to_day + 1 },
                            available_classes: t.class_type || ['2A', '3A', 'SL'],
                            train_type: t.train_type || 'SUF'
                        };
                    });
                } catch (error: any) {
                    console.error(\`[SearchEngine] RapidAPI Error (\${src}->\${dst}):\`, error.response?.data || error.message);
                    if (i === maxRetries - 1) break;
                    await new Promise(r => setTimeout(r, 1000));
                }
            }
            return [];
        };`;

if (code.match(regex)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync(file, code);
    console.log('Replaced fetchRemote in trains.ts');
} else {
    console.log('Could not find fetchRemote to replace');
}
