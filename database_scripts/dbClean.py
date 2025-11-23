#!/usr/bin/env python

"""
 * dbClean.py
 * Empties DB of all users and tasks (CS498 RK MP3 / MP4 helper)
"""

import sys
import getopt
import http.client
import json
import ssl
ssl._create_default_https_context = ssl._create_unverified_context


def usage():
    print('dbClean.py -u <baseurl> -p <port>')

def getUsers(conn):
    conn.request("GET", """/api/users?filter={"_id":1}""")
    response = conn.getresponse()
    data = response.read()
    d = json.loads(data)
    return [str(item["_id"]) for item in d.get("data", [])]

def getTasks(conn):
    conn.request("GET", """/api/tasks?filter={"_id":1}""")
    response = conn.getresponse()
    data = response.read()
    d = json.loads(data)
    return [str(item["_id"]) for item in d.get("data", [])]

def main(argv):
    baseurl = "localhost"
    port = 4000

    try:
        opts, args = getopt.getopt(argv, "hu:p:", ["url=", "port="])
    except getopt.GetoptError:
        usage()
        sys.exit(2)

    for opt, arg in opts:
        if opt == "-h":
            usage()
            sys.exit()
        elif opt in ("-u", "--url"):
            baseurl = str(arg)
        elif opt in ("-p", "--port"):
            port = int(arg)

    #changed to HTTPS for Render
    conn = http.client.HTTPSConnection(baseurl, port)

    # --- DELETE USERS ---
    users = getUsers(conn)
    while len(users):
        for user in users:
            conn.request("DELETE", "/api/users/" + user)
            conn.getresponse().read()
        users = getUsers(conn)

    # --- DELETE TASKS ---
    tasks = getTasks(conn)
    while len(tasks):
        for task in tasks:
            conn.request("DELETE", "/api/tasks/" + task)
            conn.getresponse().read()
        tasks = getTasks(conn)

    conn.close()
    print(f"All users and tasks removed at {baseurl}:{port}")

if __name__ == "__main__":
    main(sys.argv[1:])
