import json
import os

root_dir = "WebPages"
levels = 3

def extract_json_data(json_file):
    print(json_file)
    with open(json_file, "rb") as f:
        data = json.load(f)
        return data

concat_json = {
    "doc": []
}

for page_1 in os.listdir(root_dir):
    if page_1.endswith(".json"):
        data = extract_json_data(os.path.join(root_dir, page_1))
        # add data.doc to concat_json.doc and remove duplicates
        concat_json["doc"] += data["doc"]
        concat_json["doc"] = list(set(concat_json["doc"]))
    # else check if it is a directory
    elif os.path.isdir(os.path.join(root_dir, page_1)):
        for page_2 in os.listdir(os.path.join(root_dir, page_1)):
            if page_2.endswith(".json"):
                data = extract_json_data(os.path.join(root_dir, page_1, page_2))
                # add data.doc to concat_json.doc and remove duplicates
                concat_json["doc"] += data["doc"]
                concat_json["doc"] = list(set(concat_json["doc"]))
            # else check if it is a directory
            elif os.path.isdir(os.path.join(root_dir, page_1, page_2)):
                for page_3 in os.listdir(os.path.join(root_dir, page_1, page_2)):
                    if page_3.endswith(".json"):
                        data = extract_json_data(os.path.join(root_dir, page_1, page_2, page_3))
                        concat_json["doc"] += data["doc"]
                        concat_json["doc"] = list(set(concat_json["doc"]))
                    elif os.path.isdir(os.path.join(root_dir, page_1, page_2, page_3)):
                        for page_4 in os.listdir(os.path.join(root_dir, page_1, page_2, page_3)):
                            if page_4.endswith(".json"):
                                data = extract_json_data(os.path.join(root_dir, page_1, page_2, page_3, page_4))
                                concat_json["doc"] += data["doc"]
                                concat_json["doc"] = list(set(concat_json["doc"]))
                            # Add more elif statements for more levels
                            

with open("concat.json", "w") as f:
    json.dump(concat_json, f)
    
# dump all strings in concat_json.doc to a file
with open("concat.txt", "wb") as f:
    for doc in concat_json["doc"]:
        f.write(doc.encode("utf-8") + b"\n")