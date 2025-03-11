import { sequelize } from "../config.js";
import { QueryTypes } from "sequelize";

export const createPostgresTransaction = async (req, res) => {
  const t = await sequelize.transaction();
  const {
    mission_name,
    doer,
    reviewer,
    mission_config_id,
    program_id,
    activity_name,
    activity_config_id,
    language_code,
    lang_ref_description,
    lang_reference_type,
  } = req.body;

  try {
    const getRecentMissionResult = await sequelize.query(
      `SELECT id from missions ORDERBY DESC LIMIT 1;`,
      { type: QueryTypes.SELECT, transaction: t }
    );

    let { id: prev_mission_id } = getRecentMissionResult;

    const missionResult = await sequelize.query(
      `INSERT INTO missions
        (id, "name", doer, reviewer, mission_type_id, mission_config_id, start_offset, end_offset, created_date, modified_date, created_by, modified_by, status, description, base_id)
        VALUES
        ('${prev_mission_id++}', '${mission_name}', '${doer}', '${reviewer}', 0, '${mission_config_id}', 0, 5, '2025-01-23 12:15:24.930', '2025-01-23 12:15:24.930', 1, NULL, 1, NULL, 2)
        RETURNING id;
      `,
      { type: QueryTypes.INSERT, transaction: t }
    );

    const mission_id = missionResult[0][0].id;

    const getRecentProgramResult = await sequelize.query(
      `SELECT id, order_by from program_mission ORDERBY DESC LIMIT 1;`,
      { type: QueryTypes.SELECT, transaction: t }
    );

    let { id: db_program_id, order_by: program_orderBy } =
      getRecentProgramResult;

    const programMissionResult = await sequelize.query(
      `INSERT INTO program_mission
        (id, program_id, mission_id, status, order_by)
        VALUES 
        ('${db_program_id++}', '${program_id}', '${mission_id}', 1, '${program_orderBy++}')
        RETURNING id;
      `,
      { type: QueryTypes.INSERT, transaction: t }
    );

    const getRecentActivityResult = await sequelize.query(
      `SELECT id from activities ORDERBY DESC LIMIT 1;`,
      { type: QueryTypes.SELECT, transaction: t }
    );

    let { id: activity_id } = getRecentActivityResult;

    const ActivityResult = await sequelize.query(
      `INSERT INTO activities 
        (id, "name", activity_type_id, subject, activity_config_id, start_offset, end_offset, created_date, modified_date, created_by, status, doer, reviewer, display_name)
        VALUES 
        ('${activity_id++}', '${activity_name}', '${activity_config_id}', 0, 5, '2025-01-23 19:13:33.345', '2025-01-23 19:13:33.345', 1, 1, '${doer}', '${reviewer}', '')
        RETURNING id;
      `,
      { type: QueryTypes.INSERT, transaction: t }
    );

    const getRecentLangReferenceResult = await sequelize.query(
      `SELECT id from language_reference ORDERBY DESC LIMIT 1;`,
      { type: QueryTypes.SELECT, transaction: t }
    );

    let { id: lang_ref_id } = getRecentLangReferenceResult;

    const langReferenceResult = await sequelize.query(
      `INSERT INTO language_reference 
        (id, reference_id, reference_type, language_code, description)
        VALUES 
        ('${lang_ref_id}', '${mission_id}','${lang_reference_type}','${language_code}','${lang_ref_description}')
        RETURNING id;
      `,
      { type: QueryTypes.INSERT, transaction: t }
    );

    const orderId = langReferenceResult[0][0].id;

    await t.commit();
    res
      .status(200)
      .json({ message: "PostgreSQL transaction successful", userId, orderId });
  } catch (error) {
    await t.rollback();
    res
      .status(500)
      .json({ message: "PostgreSQL transaction failed", error: error.message });
  }
};
