# Manual Testing Checklist

1) Not subscribed -> bot blocks everything and web blocks protected routes.
2) Subscribe -> bot and web unlock.
3) Registration fails on empty/invalid names/phone, succeeds with correct.
4) Search examples: ftr->future, muhammad->..., azz->aziz.
5) super_admin can add limited_admin; limited_admin cannot add or search.
6) Query empty returns all users paginated (super_admin only).
