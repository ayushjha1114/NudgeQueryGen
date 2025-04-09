import { createPostgresClient } from '../config.js';
import { getNextId, getNextOrderBy } from '../utils/helper.js';

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

        const { allQueries: queries, dbFetechedIds } = await generateSql(payload, client);

        const { 
            missionId,
            activityIdStart,
            mission_activityIdStart,
            language_referenceId,
            mission_propertiesId,
            program_missionId,
            mission_propertiesOrder_by,
            program_missionRowOrder_by 
        } = dbFetechedIds;

        const {
            ticket_number,
            mission_primary_id,
            activities,
            mission_activity_primary_id,
            mission_properties_primary_id,
            program_mission_primary_id,
            lang_ref_mission_primary_id,
            mission_properties_order_by,
            program_missionRow_order_by
        } = payload;

        const rawResponse = `
            Ticket Number: ${ticket_number || ''}
            
            mission_primary_id: ${mission_primary_id || missionId}
            activity_primary_id: ${activities?.[0]?.activity_primary_id ? activities.map(activity => activity.activity_primary_id).join(', ') : activityIdStart}
            mission_activity_primary_id: ${mission_activity_primary_id ? mission_activity_primary_id.join(', ') : mission_activityIdStart}
            mission_properties_primary_id: ${mission_properties_primary_id || mission_propertiesId}
            program_mission_primary_id: ${program_mission_primary_id ? program_mission_primary_id.join(', ') : program_missionId}
            lang_ref_mission_primary_id: ${lang_ref_mission_primary_id ? lang_ref_mission_primary_id.join(', ') : language_referenceId}
            mission_properties_order_by: ${mission_properties_order_by || mission_propertiesOrder_by}
            program_missionRow_order_by: ${program_missionRow_order_by || program_missionRowOrder_by}

            Generated SQL Queries:
            ${queries}
        `;

        res.type('text/plain');
        res.status(200).send(rawResponse);
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

async function generateSql(payload, client) {
    try {
        const {
            mission_primary_id,
            activities,
            mission_activity_primary_id,
            lang_ref_mission_primary_id,
            mission_properties_primary_id,
            program_mission_primary_id,
            mission_name,
            mission_config_id,
            program_id,
            mission_properties_order_by,
            program_missionRow_order_by
        } = payload;

        const missionId = mission_primary_id || await getNextId(client, 'missions');
        const activityIdStart = activities?.[0]?.activity_primary_id || await getNextId(client, 'activities');
        const mission_activityIdStart = mission_activity_primary_id?.[0] || await getNextId(client, 'mission_activity');
        const language_referenceId = lang_ref_mission_primary_id?.[0] || await getNextId(client, 'language_reference');
        const mission_propertiesId = mission_properties_primary_id || await getNextId(client, 'mission_properties');
        const program_missionId = program_mission_primary_id?.[0] || await getNextId(client, 'program_mission');

        const mission_propertiesOrder_by = mission_properties_order_by || await getNextOrderBy(client, 'mission_properties');
        const program_missionRowOrder_by = program_missionRow_order_by || await getNextOrderBy(client, 'program_mission');

        const dbFetechedIds = {
            missionId,
            activityIdStart,
            mission_activityIdStart,
            language_referenceId,
            mission_propertiesId,
            program_missionId,
            mission_propertiesOrder_by,
            program_missionRowOrder_by
        };

        // for Mission
        const missionSql = `
            INSERT INTO missions
            (id, "name", doer, reviewer, mission_type_id, mission_config_id, start_offset, end_offset, created_date, modified_date, created_by, modified_by, status, description, base_id)
            VALUES
            (${missionId}, '${mission_name}', 'UPCM', 'BPC', 0, '${mission_config_id}', 0, 5, now(), now(), 1, NULL, 1, NULL, NULL);
        `;

        // for Activities
        const activitiesQueries = activities.map((activity, index) => {
            const activityId = activityIdStart + index;
            return `
                INSERT INTO activities
                (id, "name", activity_type_id, subject, activity_config_id, start_offset, end_offset, created_date, modified_date, created_by, status, doer, reviewer, display_name)
                VALUES
                (${activityId}, '${activity.name}', ${activity.activity_type_id}, 'Didi', '${activity.activity_config_id}', 0, 5, now(), now(), 1, 1, 'UPCM', 'BPC', '');
            `;
        });

        // for Mission-Activity Relationship
        const missionActivityQueries = activities.map((_, index) => {
            const activityId = activityIdStart + index;
            const mission_activityId = mission_activityIdStart + index;
            return `
                INSERT INTO mission_activity
                (id, mission_id, activity_id, status, order_by)
                VALUES
                (${mission_activityId}, ${missionId}, ${activityId}, 1, ${index + 1});
            `;
        });

        // for Language Reference
        const languageReferenceQuery = `
            INSERT INTO language_reference (id, reference_id, reference_type, language_code, description)
            VALUES 
            (${language_referenceId}, ${missionId}, 'MISSION', 'en', '${mission_name}'),
            (${language_referenceId + 1}, ${missionId}, 'MISSION', 'be', ''),
            (${language_referenceId + 2}, ${missionId}, 'MISSION', 'bn_tr', ''),
            (${language_referenceId + 3}, ${missionId}, 'MISSION', 'ky', ''),
            (${language_referenceId + 4}, ${missionId}, 'MISSION', 'as', ''),
            (${language_referenceId + 4}, ${missionId}, 'MISSION', 'hi', ''),
            (${language_referenceId + 4}, ${missionId}, 'MISSION', 'bn_wb', ''),
        `;

        // for Program-Mission Relationship
        const programMissionQueries = program_id.map((programId, index) => {
            const prog_missionId = program_missionId + index;
            return `
                INSERT INTO program_mission (id, program_id, mission_id, status, order_by)
                VALUES
                (${prog_missionId}, ${programId}, ${missionId}, 1, ${program_missionRowOrder_by});
            `;
        });

        // for Mission Properties
        const missionPropertiesQuery = `
            INSERT INTO mission_properties
            (id, "name", dashboard_name, order_by, created_date, modified_date, created_by, modified_by, status, "type")
            VALUES
            (${mission_propertiesId}, '${mission_name}', '${mission_name}', ${mission_propertiesOrder_by}, now(), now(), 1, 1, 1, '');
        `;

        // for Training (only if activity_type_id is 7)
        const trainingQueries = activities
            .filter(activity => activity.activity_type_id === 7)
            .map(activity => {
                return `
                    INSERT INTO training
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

        return { allQueries, dbFetechedIds };
    } catch (err) {
        throw new Error(`Error in SQL queries: ${err.message}`);
    }
}

export default missionActivityController;
