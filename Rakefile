require 'rubygems'
require 'pdoc'   

task :doc do
    PDoc::Runner.new("cafemapper.js", {
      :output    => DOC_DIR,
      :templates => File.join(TEMPLATES_DIR, "html"),
#      :index_page => 'README.markdown'
    }).run
end
