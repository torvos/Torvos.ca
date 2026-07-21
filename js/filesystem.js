    window.FileSystem = {

    "/": {
        type: "dir",
        hidden: false,
        mode: "rwxr-xr-x",
        owner: "root",
        group: "root",
        created: Date.parse("2020-01-01T08:00:00Z"),
        modified: Date.parse("2026-07-01T10:00:00Z"),
        accessed: Date.parse("2026-07-01T10:00:00Z"),
        children: {
            home: {
                type: "dir",
                hidden: false,
                mode: "rwxr-xr-x",
                owner: "root",
                group: "root",
                created: Date.parse("2020-01-01T08:00:00Z"),
                modified: Date.parse("2026-07-01T10:00:00Z"),
                accessed: Date.parse("2026-07-01T10:00:00Z"),
                children: {
                    guest:{
                        type: "dir",
                        hidden: false,
                        mode: "rwxr-xr-x",
                        owner: "guest",
                        group: "guest",
                        created: Date.parse("2020-01-01T08:00:00Z"),
                        modified: Date.parse("2026-07-01T10:00:00Z"),
                        accessed: Date.parse("2026-07-01T10:00:00Z"),
                        children: {
                            about: {
                                type: "dir",
                                hidden: false,
                                mode: "rwxr-xr-x",
                                owner: "guest",
                                group: "guest",
                                created: Date.parse("2020-01-01T08:00:00Z"),
                                modified: Date.parse("2026-07-01T10:00:00Z"),
                                accessed: Date.parse("2026-07-01T10:00:00Z"),
                                children: {
                                    "bio.md": {
                                        type: "file",
                                        hidden: false,
                                        mode: "rw-r--r--",
                                        owner: "guest",
                                        group: "guest",
                                        created: Date.parse("2020-01-01T08:00:00Z"),
                                        modified: Date.parse("2026-07-01T10:00:00Z"),
                                        accessed: Date.parse("2026-07-01T10:00:00Z"),
                                        content: `+------------------------------------------------------------------------------------------+
| Senior cloud architecture and cybersecurity leader with more than 23 years of            |
| experience delivering enterprise technology solutions. Recognized for leading cloud      | 
| modernization initiatives, establishing enterprise architecture and security strategies, |
| building high-performing technical teams, and advising executives on cloud adoption,     |
| cybersecurity, DevSecOps, and digital transformation.                                    |
+------------------------------------------------------------------------------------------+`}
                                }
                            },
                            "contact.md": {
                                type: "file",
                                hidden: false,
                                mode: "rw-r--r--",
                                owner: "guest",
                                group: "guest",
                                created: Date.parse("2020-01-01T08:00:00Z"),
                                modified: Date.parse("2026-07-01T10:00:00Z"),
                                accessed: Date.parse("2026-07-01T10:00:00Z"),
                                content: `+--------------------------------------------------------+
| - Email: contact@torvos.ca                             |
| - GitHub: https://github.com/torvos                    |
| - Bluesky: https://bsky.app/profile/torvos.bsky.social |
+--------------------------------------------------------+`},
                            "resume.md": {
                                type: "file",
                                hidden: false,       
                                mode: "rw-r--r--",
                                owner: "guest",
                                group: "guest",
                                created: Date.parse("2020-01-01T08:00:00Z"),
                                modified: Date.parse("2026-07-01T10:00:00Z"),
                                accessed: Date.parse("2026-07-01T10:00:00Z"),
                                content: "Resume download available soon, check linkedIn for now."
                            },
                            ".hidden.md": {
                                type: "file",
                                hidden: true,
                                mode: "rw-r--r--",
                                owner: "guest",
                                group: "guest",
                                created: Date.parse("2020-01-01T08:00:00Z"),
                                modified: Date.parse("2026-07-01T10:00:00Z"),
                                accessed: Date.parse("2026-07-01T10:00:00Z"),
                                content: "Hidden file"
                            }                            
                        }
                    }
                }
            }
        }
    }
};