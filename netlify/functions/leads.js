// Netlify Function: trả danh sách đơn đăng ký (khách hàng) của form "dang-ky".
// Bảo vệ bằng Netlify Identity: chỉ tài khoản admin đã đăng nhập mới đọc được.
// Cần 2 biến môi trường trong Netlify:
//   NETLIFY_TOKEN : Personal Access Token (User settings > Applications)
//   SITE_ID       : ID của site (Project configuration > General > Project ID)

exports.handler = async function (event, context) {
  const cors = { "Content-Type": "application/json; charset=utf-8" };

  // 1) Yêu cầu đăng nhập
  const user = context.clientContext && context.clientContext.user;
  if (!user) {
    return { statusCode: 401, headers: cors, body: JSON.stringify({ error: "Chưa đăng nhập hoặc phiên đã hết hạn." }) };
  }

  const TOKEN = process.env.NETLIFY_TOKEN;
  const SITE_ID = process.env.SITE_ID;
  if (!TOKEN || !SITE_ID) {
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({ error: "Thiếu cấu hình NETLIFY_TOKEN hoặc SITE_ID trong Environment variables." })
    };
  }

  const auth = { Authorization: "Bearer " + TOKEN };

  try {
    // 2) Tìm form theo tên "dang-ky"
    const formsRes = await fetch("https://api.netlify.com/api/v1/sites/" + SITE_ID + "/forms", { headers: auth });
    if (!formsRes.ok) throw new Error("Không lấy được danh sách form (HTTP " + formsRes.status + ").");
    const forms = await formsRes.json();
    const form = (forms || []).find(function (f) { return f.name === "dang-ky"; }) || (forms || [])[0];
    if (!form) return { statusCode: 200, headers: cors, body: JSON.stringify({ leads: [], count: 0 }) };

    // 3) Lấy submissions
    const subRes = await fetch("https://api.netlify.com/api/v1/forms/" + form.id + "/submissions?per_page=300", { headers: auth });
    if (!subRes.ok) throw new Error("Không lấy được danh sách đơn (HTTP " + subRes.status + ").");
    const subs = await subRes.json();

    const leads = (subs || []).map(function (s) {
      const d = s.data || {};
      return {
        ho_ten: d.ho_ten || s.name || "",
        email: d.email || s.email || "",
        so_dien_thoai: d.so_dien_thoai || "",
        dia_chi: d.dia_chi || "",
        so_luong: d.so_luong || "",
        ghi_chu: d.ghi_chu || "",
        nguon_traffic: d.nguon_traffic || "",
        thoi_gian: d.thoi_gian || "",
        created_at: s.created_at || ""
      };
    });

    return { statusCode: 200, headers: cors, body: JSON.stringify({ leads: leads, count: leads.length }) };
  } catch (e) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: String(e.message || e) }) };
  }
};
