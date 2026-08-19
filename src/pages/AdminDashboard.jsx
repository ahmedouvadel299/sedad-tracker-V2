function AdminDashboard() {
  return (
    <div className="page">
      <h1>Tableau de bord — Administration</h1>
      <nav>
        <span>Vue d'ensemble</span> | <span>Listes</span> | <span>Équipe</span> |{' '}
        <span>Rapports</span> | <span>Paramètres</span>
      </nav>
      {/* TODO: كل تبويب يصبح مكوّناً منفصلاً في مجلد components/ */}
    </div>
  )
}

export default AdminDashboard
