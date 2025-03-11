import { createPostgresClient } from '../config.js';

export const missionActivityController = async (req, res) => {
    const { db_name } = req.body;

    if (!db_name) {
        return res.status(400).send("Database name is required.");
    }
    try {
        const client = createPostgresClient(db_name);
        await client.connect();
        console.log(`Connected to PostgreSQL database: ${db_name}`);
        const payload = req.body;

        const queries = await generateSql(payload, client);

        res.type('text/plain');
        res.status(200).send(queries);
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

async function generateSql(payload, client) {
    try {
        const missionQuery = 'SELECT id FROM public.missions ORDER BY id DESC LIMIT 1';
        const activityQuery = 'SELECT id FROM public.activities ORDER BY id DESC LIMIT 1';
        const mission_activityQuery = 'SELECT id FROM public.mission_activity ORDER BY id DESC LIMIT 1';
        const language_referenceQuery = 'SELECT id FROM public.language_reference ORDER BY id DESC LIMIT 1';
        const mission_propertiesQuery = 'SELECT id, order_by FROM public.mission_properties ORDER BY id DESC LIMIT 1';
        const program_missionQuery = 'SELECT id, order_by FROM public.program_mission ORDER BY id DESC LIMIT 1';

        const [missionRow, activityRow, mission_activityRow, language_referenceRow, mission_propertiesRow, program_missionRow] = await Promise.all([
            client.query(missionQuery),
            client.query(activityQuery),
            client.query(mission_activityQuery),
            client.query(language_referenceQuery),
            client.query(mission_propertiesQuery),
            client.query(program_missionQuery)
        ]);

        const missionId = missionRow.rows[0]?.id + 1;
        const activityIdStart = parseInt(activityRow.rows[0]?.id) + 1;
        const mission_activityIdStart = parseInt(mission_activityRow.rows[0]?.id) + 1;
        const language_referenceId = parseInt(language_referenceRow.rows[0]?.id) + 1;
        const mission_propertiesId = parseInt(mission_propertiesRow.rows[0]?.id) + 1;
        const program_missionId = parseInt(program_missionRow.rows[0]?.id) + 1;
        const mission_propertiesOrder_by = parseInt(mission_propertiesRow.rows[0]?.order_by) + 1;
        const program_missionRowOrder_by = parseInt(program_missionRow.rows[0]?.order_by) + 1;

        // for Mission
        const missionSql = `
            INSERT INTO public.missions
            (id, "name", doer, reviewer, mission_type_id, mission_config_id, start_offset, end_offset, created_date, modified_date, created_by, modified_by, status, description, base_id)
            VALUES
            (${missionId}, '${payload.mission_name}', 'UPCM', 'BPC', 0, '${payload.mission_config_id}', 0, 5, now(), now(), 1, NULL, 1, NULL, NULL);
        `;

        // for Activities
        const activitiesQueries = payload.activities.map((activity, index) => {
            const activityId = activityIdStart + index;
            return `
                INSERT INTO public.activities
                (id, "name", activity_type_id, subject, activity_config_id, start_offset, end_offset, created_date, modified_date, created_by, status, doer, reviewer, display_name)
                VALUES
                (${activityId}, '${activity.name}', ${activity.activity_type_id}, 'Didi', '${activity.activity_config_id}', 0, 5, now(), now(), 1, 1, 'UPCM', 'BPC', '');
            `;
        });

        // for Mission-Activity Relationship
        const missionActivityQueries = payload.activities.map((_, index) => {
            const activityId = activityIdStart + index;
            const mission_activityId = mission_activityIdStart + index;
            return `
        INSERT INTO public.mission_activity
        (id, mission_id, activity_id, status, order_by)
        VALUES
        (${mission_activityId}, ${missionId}, ${activityId}, 1, ${index + 1});
      `;
        });

        // for Language Reference
        const languageReferenceQuery = `
      INSERT INTO public.language_reference (id, reference_id, reference_type, language_code, description)
      VALUES 
      (${language_referenceId}, ${missionId}, 'MISSION', 'en', '${payload.mission_name}'),
      (${language_referenceId + 1}, ${missionId}, 'MISSION', 'be', ''),
      (${language_referenceId + 2}, ${missionId}, 'MISSION', 'bn_tr', ''),
      (${language_referenceId + 3}, ${missionId}, 'MISSION', 'ky', ''),
      (${language_referenceId + 4}, ${missionId}, 'MISSION', 'as', '');
    `;

        // for Program-Mission Relationship
        const programMissionQueries = payload.Program_id.map((programId, index) => {
            const prog_missionId = program_missionId + index;
            return `
        INSERT INTO public.program_mission (id, program_id, mission_id, status, order_by)
        VALUES
        (${prog_missionId}, ${programId}, ${missionId}, 1, ${program_missionRowOrder_by});
      `;
        });

        // for Mission Properties
        const missionPropertiesQuery = `
      INSERT INTO public.mission_properties
      (id, "name", dashboard_name, order_by, created_date, modified_date, created_by, modified_by, status, "type")
      VALUES
      (${mission_propertiesId}, '${payload.mission_name}', '${payload.mission_name}', ${mission_propertiesOrder_by}, now(), now(), 1, 1, 1, '');
    `;

        // for Training (only if activity_type_id is 7)
        const trainingQueries = payload.activities
            .filter(activity => activity.activity_type_id === 7)
            .map(activity => {
                return `
          INSERT INTO public.training
          (id, "name", created_by, created_date, modified_by, modified_date, status)
          VALUES
          (000, '${activity.name}', 1, now(), 1, now(), 1);
        `;
            });

        const allQueries = [
            missionSql,
            ...activitiesQueries,
            ...missionActivityQueries,
            languageReferenceQuery,
            ...programMissionQueries,
            missionPropertiesQuery,
            ...trainingQueries,
        ].join("\n");

        return allQueries;
    } catch (err) {
        throw new Error(`Error inI SQL queries: ${err.message}`);
    }
}

export default missionActivityController;
